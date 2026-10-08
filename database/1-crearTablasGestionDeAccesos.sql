--- GESTION DE ACCESOS ---

BEGIN;

-- usuarios
-- La baja es lógica (fecha_baja). El email no es único en la base: sólo no puede repetirse
-- entre usuarios activos (lo valida el backend).
CREATE TABLE IF NOT EXISTS public.usuarios
(
    id serial NOT NULL,
    email character varying(50) NOT NULL,
    nombre character varying(50),
    apellido character varying(50),
    contrasena character varying(255) NOT NULL,
    dni integer,
    telefono character varying,
    fecha_alta timestamp with time zone NOT NULL,
    fecha_actualizacion timestamp with time zone,
    fecha_baja timestamp with time zone,
    PRIMARY KEY (id)
);

-- roles
-- token_duracion: minutos que dura una sesión (con varios roles se toma el mayor).
CREATE TABLE IF NOT EXISTS public.roles
(
    id serial NOT NULL,
    nombre character varying(50) NOT NULL,
    token_duracion integer NOT NULL DEFAULT 60,
    PRIMARY KEY (id),
    CONSTRAINT roles_nombre_unico UNIQUE (nombre)
);

-- paneles (pantallas del frontend)
CREATE TABLE IF NOT EXISTS public.paneles
(
    id serial NOT NULL,
    nombre character varying(50) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT paneles_nombre_unico UNIQUE (nombre)
);

-- modulos (recursos del backend sobre los que se dan permisos)
CREATE TABLE IF NOT EXISTS public.modulos
(
    id serial NOT NULL,
    nombre character varying(50) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT modulos_nombre_unico UNIQUE (nombre)
);

-- sesiones
-- Una fila por login. fecha_expiracion = fecha_login + token_duracion del rol.
CREATE TABLE IF NOT EXISTS public.sesiones
(
    id serial NOT NULL,
    token character varying NOT NULL,
    fecha_login timestamp with time zone NOT NULL,
    fecha_logout timestamp with time zone,
    activo boolean NOT NULL,
    id_usuario integer NOT NULL,
    fecha_expiracion timestamp with time zone,
    PRIMARY KEY (id),
    CONSTRAINT id_usuario_fk FOREIGN KEY (id_usuario)
        REFERENCES public.usuarios (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sesiones_token_idx ON public.sesiones (token);

-- recuperaciones_contrasena
-- Pedidos de "¿Olvidaste tu contraseña?". Se guarda el hash (SHA-256) del
-- token que viaja en el link del correo, nunca el token en sí.
CREATE TABLE IF NOT EXISTS public.recuperaciones_contrasena
(
    id serial NOT NULL,
    token_hash character varying(64) NOT NULL,
    fecha_alta timestamp with time zone NOT NULL DEFAULT NOW(),
    fecha_expiracion timestamp with time zone NOT NULL,
    fecha_uso timestamp with time zone,
    id_usuario integer NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT token_hash_unico UNIQUE (token_hash),
    CONSTRAINT id_usuario_fk FOREIGN KEY (id_usuario)
        REFERENCES public.usuarios (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- roles_paneles
CREATE TABLE IF NOT EXISTS public.roles_paneles
(
    id serial NOT NULL,
    id_rol integer NOT NULL,
    id_panel integer NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT roles_paneles_unico UNIQUE (id_rol, id_panel),
    CONSTRAINT id_rol_fk FOREIGN KEY (id_rol)
        REFERENCES public.roles (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT id_panel_fk FOREIGN KEY (id_panel)
        REFERENCES public.paneles (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- roles_modulos
--   leer -> consultar   escribir -> dar de alta   editar -> modificar y dar de baja
CREATE TABLE IF NOT EXISTS public.roles_modulos
(
    id serial NOT NULL,
    editar boolean,
    escribir boolean,
    leer boolean,
    id_rol integer NOT NULL,
    id_modulo integer NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT roles_modulos_unico UNIQUE (id_rol, id_modulo),
    CONSTRAINT id_rol_fk FOREIGN KEY (id_rol)
        REFERENCES public.roles (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT id_modulo_fk FOREIGN KEY (id_modulo)
        REFERENCES public.modulos (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- roles_usuarios
CREATE TABLE IF NOT EXISTS public.roles_usuarios
(
    id serial NOT NULL,
    id_rol integer NOT NULL,
    id_usuario integer NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT roles_usuarios_unico UNIQUE (id_rol, id_usuario),
    CONSTRAINT id_rol_fk FOREIGN KEY (id_rol)
        REFERENCES public.roles (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT id_usuario_fk FOREIGN KEY (id_usuario)
        REFERENCES public.usuarios (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

COMMIT;
