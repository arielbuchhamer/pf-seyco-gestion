import { Usuario } from './usuario.model';

export type EstadoTarea = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA';
export type Prioridad = 'BAJA' | 'MEDIA' | 'ALTA';

export interface Tarea {
  id: number;
  nombre: string;
  descripcion: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  // Seguimiento: inicio real y "fin estimado / real" (se cargan después de fijar la línea base).
  fechaInicioReal: string | null;
  fechaFinReal: string | null;
  // % de avance físico (0-100), cargado con las fechas reales. En una tarea con subtareas, el promedio.
  avance: number | null;
  estado: EstadoTarea;
  prioridad: Prioridad | null;
  proyecto: { id: number; nombre: string };
  responsable: Usuario | null;
  // Subtareas (grupos del presupuesto importado): id de la tarea padre. null en las de primer nivel.
  padreId: number | null;
  // Numeración del Excel ("2", "2.1") y posición entre hermanas; null en tareas cargadas a mano.
  numero: string | null;
  orden: number | null;
}

// Al crear/editar, el backend sólo necesita los ids de proyecto/responsable (no hay DTO en el
// back: la entidad se resuelve contra la base — ver TareaService.crear en el backend).
export interface TareaInput {
  nombre: string;
  descripcion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  prioridad?: Prioridad;
  proyecto: { id: number };
  responsable?: { id: number };
}

// PUT /api/tareas/fechas — fechas de una tarea en la carga de fechas de la solapa Tareas.
export interface FechasTarea {
  id: number;
  fechaInicio: string | null;
  fechaFin: string | null;
  fechaInicioReal: string | null;
  fechaFinReal: string | null;
  avance: number | null;
}

export const ESTADOS_TAREA: EstadoTarea[] = ['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA'];

export const ESTADO_TAREA_LABEL: Record<EstadoTarea, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROGRESO: 'En progreso',
  COMPLETADA: 'Completada',
};
