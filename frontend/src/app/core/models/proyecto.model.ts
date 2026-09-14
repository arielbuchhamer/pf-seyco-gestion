export type EstadoProyecto = 'PLANIFICADO' | 'EN_CURSO' | 'FINALIZADO';

export const ESTADOS_PROYECTO: EstadoProyecto[] = ['PLANIFICADO', 'EN_CURSO', 'FINALIZADO'];

export const ESTADO_PROYECTO_LABEL: Record<EstadoProyecto, string> = {
  PLANIFICADO: 'Planificado',
  EN_CURSO: 'En curso',
  FINALIZADO: 'Finalizado',
};

export interface Proyecto {
  id: number;
  nombre: string;
  descripcion: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  estado: EstadoProyecto;
}

export interface ProyectoInput {
  nombre: string;
  descripcion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  estado?: EstadoProyecto;
}

// GET /api/proyectos/{id}/progreso — seguimiento: foto del estado actual de las tareas.
export interface Progreso {
  proyectoId: number;
  totalTareas: number;
  tareasPorEstado: Partial<Record<'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA', number>>;
  porcentajeAvance: number;
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
