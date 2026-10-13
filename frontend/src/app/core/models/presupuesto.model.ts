// Importación de proyectos desde el Excel de presupuesto y presupuesto del proyecto
// (ver ImportacionDtos en el backend).

export type TipoItemPresupuesto = 'CAPITULO' | 'GRUPO' | 'ARMADO' | 'ITEM';
export type EstadoPresupuesto = 'ABIERTO' | 'CERRADO';
export type NivelVerificacion = 'OK' | 'ADVERTENCIA' | 'ERROR';

// Renglón del árbol: capítulo (tarea) › grupo (subtarea) › armado › ítem. Montos en pesos, sin IVA.
export interface NodoPresupuesto {
  tipo: TipoItemPresupuesto;
  numero: string;
  codigo: string | null;
  descripcion: string | null;
  cantidad: number | null;
  unidad: string | null;
  manoObra: number;
  equipos: number;
  materiales: number;
  terceros: number;
  unitario: number | null;
  total: number;
  // Tarea creada para el capítulo/grupo (null en la previsualización y en armados/ítems).
  tareaId: number | null;
  hijos: NodoPresupuesto[];
}

export interface TotalesRubro {
  manoObra: number;
  equipos: number;
  materiales: number;
  terceros: number;
  total: number;
}

export interface Verificacion {
  nivel: NivelVerificacion;
  titulo: string;
  detalle: string | null;
}

export interface EncabezadoPresupuesto {
  obra: string | null;
  cliente: string | null;
  atencion: string | null;
  refCliente: string | null;
  fecha: string | null;
  plazoDias: number | null;
}

// POST /api/proyectos/importacion/previsualizar
export interface Previsualizacion {
  archivoNombre: string;
  encabezado: EncabezadoPresupuesto;
  cantidadTareas: number;
  cantidadSubtareas: number;
  cantidadItems: number;
  filasOmitidas: number;
  totales: TotalesRubro;
  verificaciones: Verificacion[];
  puedeImportar: boolean;
  items: NodoPresupuesto[];
}

// Parte "datos" de POST /api/proyectos/importacion.
export interface DatosImportacion {
  nombre: string;
  cliente: string;
  refCliente: string;
  atencion: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string | null;
}

// GET /api/proyectos/{id}/presupuesto
export interface PresupuestoDetalle {
  id: number;
  fecha: string | null;
  plazoDias: number | null;
  estado: EstadoPresupuesto;
  totales: TotalesRubro;
  items: NodoPresupuesto[];
}
