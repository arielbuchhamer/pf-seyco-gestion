--- SEGUIMIENTO DE OBRA ---
-- Clasificación de proyectos, % de avance de tareas, costos reales y certificaciones.
-- El backend (ddl-auto=update) crea esto solo al arrancar; el script sirve para crearlo a mano
-- (pgAdmin) o como referencia del modelo.

BEGIN;

-- Clasificación para filtrar el portafolio.
-- tipo_cliente: EPE | VIALIDAD | PRIVADO | INDUSTRIA
-- tipo_obra:    ZANJEO | ILUMINACION | REDES_ENERGIA | INDUSTRIAL | OTRA
ALTER TABLE public.proyecto ADD COLUMN IF NOT EXISTS tipo_cliente character varying(20);
ALTER TABLE public.proyecto ADD COLUMN IF NOT EXISTS tipo_obra character varying(20);

-- % de avance físico (0-100), cargado junto con las fechas reales.
ALTER TABLE public.tarea ADD COLUMN IF NOT EXISTS avance integer;

-- costo_real: gastos reales de la obra por rubro, para comparar con lo cotizado.
-- rubro: MANO_OBRA | EQUIPOS | MATERIALES | TERCEROS
CREATE TABLE IF NOT EXISTS public.costo_real
(
    id bigserial NOT NULL,
    proyecto_id bigint NOT NULL REFERENCES public.proyecto (id),
    fecha date NOT NULL,
    rubro character varying(20) NOT NULL,
    descripcion character varying(300) NOT NULL,
    comprobante character varying(100),
    monto numeric(19, 2) NOT NULL,
    PRIMARY KEY (id)
);

-- certificacion: certificados de obra (= facturas al cliente por lo ejecutado).
-- tipo:   ANTICIPO | AVANCE | FINAL
-- estado: PENDIENTE_COBRO | COBRADA
CREATE TABLE IF NOT EXISTS public.certificacion
(
    id bigserial NOT NULL,
    proyecto_id bigint NOT NULL REFERENCES public.proyecto (id),
    numero integer NOT NULL,
    tipo character varying(20) NOT NULL,
    fecha_emision date NOT NULL,
    porcentaje numeric(7, 2),
    monto numeric(19, 2) NOT NULL,
    nro_factura character varying(50),
    estado character varying(20) NOT NULL,
    fecha_cobro date,
    observaciones character varying(500),
    PRIMARY KEY (id)
);

COMMIT;
