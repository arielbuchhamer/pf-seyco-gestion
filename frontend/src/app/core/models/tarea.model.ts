import { Usuario } from './usuario.model';

export type EstadoTarea = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA';
export type Prioridad = 'BAJA' | 'MEDIA' | 'ALTA';

export interface Tarea {
  id: number;
  nombre: string;
  descripcion: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  estado: EstadoTarea;
  prioridad: Prioridad | null;
  proyecto: { id: number };
  responsable: Usuario | null;
}

// Al crear, el backend sólo necesita los ids de proyecto/responsable (no hay DTO en el
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

export const ESTADOS_TAREA: EstadoTarea[] = ['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA'];

export const ESTADO_TAREA_LABEL: Record<EstadoTarea, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROGRESO: 'En progreso',
  COMPLETADA: 'Completada',
};
