import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EstadoTarea, Tarea, TareaInput } from '../models/tarea.model';

@Injectable({ providedIn: 'root' })
export class TareaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/tareas';

  listar(proyectoId?: number): Observable<Tarea[]> {
    const params: Record<string, string> = proyectoId ? { proyectoId: String(proyectoId) } : {};
    return this.http.get<Tarea[]>(this.baseUrl, { params });
  }

  crear(tarea: TareaInput): Observable<Tarea> {
    return this.http.post<Tarea>(this.baseUrl, tarea);
  }

  actualizar(id: number, cambios: TareaInput): Observable<Tarea> {
    return this.http.put<Tarea>(`${this.baseUrl}/${id}`, cambios);
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
