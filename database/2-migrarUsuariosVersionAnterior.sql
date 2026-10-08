--- MIGRACIÓN DESDE LA VERSIÓN ANTERIOR ---
--
-- Sólo para una base que ya tenía datos de la versión anterior (tabla `usuario`, en
-- singular, con las columnas `clave` y `rol`). Una base nueva no lo necesita.
--
-- Pasos (con el backend APAGADO):
--   1. Correr 1-crearTablasGestionDeAccesos.sql
--   2. Correr este script
--   3. Levantar el backend: DataSeeder completa módulos, paneles y permisos.
--
-- Copia cada usuario a `usuarios` conservando su id (así las tareas y el historial siguen
-- apuntando a la misma persona), le asigna el rol equivalente y borra la tabla vieja:
--   ADMINISTRADOR -> admin   USUARIO -> visor
-- DROP ... CASCADE borra también las foreign keys de tarea/historial que apuntaban a
-- `usuario`; el backend las vuelve a crear apuntando a `usuarios` al arrancar.
--
-- Alternativa si los datos no importan: borrar la base y crearla de nuevo vacía.

BEGIN;

INSERT INTO public.roles (nombre, token_duracion)
VALUES ('admin', 480), ('visor', 480)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.usuarios (id, email, nombre, apellido, contrasena, fecha_alta)
SELECT u.id, u.email, u.nombre, u.apellido, u.clave, NOW()
FROM public.usuario u
WHERE NOT EXISTS (SELECT 1 FROM public.usuarios n WHERE n.id = u.id);

INSERT INTO public.roles_usuarios (id_rol, id_usuario)
SELECT r.id, u.id
FROM public.usuario u
JOIN public.roles r
    ON r.nombre = CASE WHEN u.rol = 'ADMINISTRADOR' THEN 'admin' ELSE 'visor' END
ON CONFLICT (id_rol, id_usuario) DO NOTHING;

-- Los próximos usuarios siguen después del id más alto copiado
SELECT setval(pg_get_serial_sequence('public.usuarios', 'id'),
              GREATEST((SELECT MAX(id) FROM public.usuarios), 1));

DROP TABLE public.usuario CASCADE;

COMMIT;
