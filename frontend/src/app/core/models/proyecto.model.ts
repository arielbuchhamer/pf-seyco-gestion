import { Usuario } from './usuario.model';

export type EstadoProyecto = 'PLANIFICADO' | 'EN_CURSO' | 'FINALIZADO';

export const ESTADOS_PROYECTO: EstadoProyecto[] = ['PLANIFICADO', 'EN_CURSO', 'FINALIZADO'];

export const ESTADO_PROYECTO_LABEL: Record<EstadoProyecto, string> = {
  PLANIFICADO: 'Planificado',
  EN_CURSO: 'En curso',
  FINALIZADO: 'Finalizado',
};

// Clasificación de la obra para filtrar el portafolio (para quién es y qué clase de obra).
export type TipoCliente = 'EPE' | 'VIALIDAD' | 'PRIVADO' | 'INDUSTRIA';
export type TipoObra = 'ZANJEO' | 'ILUMINACION' | 'REDES_ENERGIA' | 'INDUSTRIAL' | 'OTRA';

export const TIPO_CLIENTE_LABEL: Record<TipoCliente, string> = {
  EPE: 'EPE',
  VIALIDAD: 'Vialidad',
  PRIVADO: 'Privado',
  INDUSTRIA: 'Industria',
};

export const TIPO_OBRA_LABEL: Record<TipoObra, string> = {
  ZANJEO: 'Zanjeo',
  ILUMINACION: 'Iluminación',
  REDES_ENERGIA: 'Redes de energía',
  INDUSTRIAL: 'Obra industrial',
  OTRA: 'Otra',
};

export const TIPOS_CLIENTE = Object.keys(TIPO_CLIENTE_LABEL) as TipoCliente[];
export const TIPOS_OBRA = Object.keys(TIPO_OBRA_LABEL) as TipoObra[];

export interface Proyecto {
  id: number;
  nombre: string;
  descripcion: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  estado: EstadoProyecto;
  cliente: string | null;
  refCliente: string | null;
  atencion: string | null;
  tipoCliente: TipoCliente | null;
  tipoObra: TipoObra | null;
  // Origen: Excel del que se importó el proyecto (null en los cargados antes de la importación).
  archivoNombre: string | null;
  fechaImportacion: string | null;
  // Cuándo se fijó la línea base; null = en planificación (se editan las fechas plan).
  lineaBaseFecha: string | null;
}

export interface ProyectoInput {
  nombre: string;
  cliente?: string;
  refCliente?: string;
  atencion?: string;
  descripcion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  estado?: EstadoProyecto;
  tipoCliente?: TipoCliente | null;
  tipoObra?: TipoObra | null;
}

// GET /api/proyectos/{id}/progreso — seguimiento: foto del estado actual de las tareas.
export interface Progreso {
  proyectoId: number;
  totalTareas: number;
  tareasPorEstado: Partial<Record<'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA', number>>;
  porcentajeAvance: number;
  // Responsables de las tareas del proyecto, sin repetir (avatares de la tarjeta del listado).
  responsables: Usuario[];
}

// GET /api/proyectos/{id}/rendimiento — duración real (según el historial de estados de
// cada tarea) contra la planificada. Tareas que nunca pasaron por EN_PROGRESO/COMPLETADA
// quedan afuera del cálculo (no hay con qué comparar).
export interface RendimientoTarea {
  tareaId: number;
  nombre: string;
  diasPlanificados: number;
  diasReales: number;
  desvioDias: number;
}

export interface Rendimiento {
  proyectoId: number;
  tareasConsideradas: number;
  desvioPromedioDias: number;
  detalle: RendimientoTarea[];
}
