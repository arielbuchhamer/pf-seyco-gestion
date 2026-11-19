# Base de datos

Scripts para crear la base `seyco` a mano (PostgreSQL 16), separados por módulo.
El diagrama de todas las tablas está en [DER.png](DER.png).

> El backend también crea las tablas solo al arrancar (`ddl-auto=update`). Estos scripts
> sirven para crear la base desde pgAdmin y como guía del modelo.

## Orden de ejecución

| # | Script | Módulo | Tablas |
|---|---|---|---|
| 1 | `1-gestionDeAccesos.sql` | Usuarios, roles, permisos y sesiones | usuarios, roles, modulos, paneles, roles_usuarios, roles_modulos, roles_paneles, sesiones, recuperaciones_contrasena |
| 2 | `2-gestionDeProyectos.sql` | Obras y tareas | proyecto, archivo_proyecto, tarea, historial_estado_tarea |
| 3 | `3-presupuesto.sql` | Presupuesto de cada obra | presupuesto, item_presupuesto |
| 4 | `4-seguimientoDeObra.sql` | Gastos y cobros | costo_real (puede apuntar a un renglón del presupuesto), certificacion |

Cada script depende de los anteriores (por las claves foráneas), así que van en ese orden.
Todos se pueden correr más de una vez sin problema (`IF NOT EXISTS`).

## Cómo correrlos en pgAdmin

1. Crear la base: clic derecho en **Databases → Create → Database…**, nombre `seyco`.
2. Clic derecho sobre `seyco` → **Query Tool**.
3. Abrir cada script (ícono de carpeta), en orden, y ejecutarlo con **F5**.
4. Levantar el backend: carga los módulos, paneles, roles y los usuarios de prueba
   (`admin@seyco.com / admin123`, `visor@seyco.com / visor123`).

## Migraciones

`migraciones/migrarUsuariosVersionAnterior.sql`: sólo para una base con datos de la versión
anterior del sistema (tabla `usuario` en singular). Una base nueva no lo necesita.
