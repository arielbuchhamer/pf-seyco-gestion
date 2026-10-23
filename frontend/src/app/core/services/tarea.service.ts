import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EstadoTarea, FechasTarea, Tarea, TareaInput } from '../models/tarea.model';

@Injectable({ providedIn: 'root' })
export class TareaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/tareas';

  listar(proyectoId?: number): Observable<Tarea[]> {
    const params: Record<string, string> = proyectoId ? { proyectoId: String(proyectoId) } : {};
    return this.http.get<Tarea[]>(this.baseUrl, { params });
  }

  // Tareas asignadas al usuario logueado, de todos los proyectos.
  listarMias(): Observable<Tarea[]> {
    return this.http.get<Tarea[]>(`${this.baseUrl}/mias`);
  }

  // padreId: crea una subtarea de esa tarea (si no, es una tarea principal).
  crear(tarea: TareaInput, padreId?: number | null): Observable<Tarea> {
    const params: Record<string, string> = padreId ? { padreId: String(padreId) } : {};
    return this.http.post<Tarea>(this.baseUrl, tarea, { params });
  }

  actualizar(id: number, cambios: TareaInput): Observable<Tarea> {
    return this.http.put<Tarea>(`${this.baseUrl}/${id}`, cambios);
  }

  // Carga de fechas (plan o reales, según la línea base) de varias tareas del proyecto a la vez.
  guardarFechas(proyectoId: number, fechas: FechasTarea[]): Observable<Tarea[]> {
    return this.http.put<Tarea[]>(`${this.baseUrl}/fechas`, fechas, { params: { proyectoId: String(proyectoId) } });
  }

  // Único punto donde cambia el estado de una tarea: dispara el registro automático
  // de historial en el backend (base del cálculo de seguimiento/rendimiento).
  cambiarEstado(id: number, estado: EstadoTarea): Observable<Tarea> {
    const params: Record<string, string> = { estado };
    return this.http.patch<Tarea>(`${this.baseUrl}/${id}/estado`, null, { params });
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
