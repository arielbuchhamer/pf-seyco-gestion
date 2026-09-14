import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  EstadoProyecto,
  Progreso,
  Proyecto,
  ProyectoInput,
  Rendimiento,
} from '../models/proyecto.model';

@Injectable({ providedIn: 'root' })
export class ProyectoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/proyectos';

  listar(nombre?: string, estado?: EstadoProyecto | ''): Observable<Proyecto[]> {
    const params: Record<string, string> = {};
    if (nombre) params['nombre'] = nombre;
    if (estado) params['estado'] = estado;
    return this.http.get<Proyecto[]>(this.baseUrl, { params });
  }

  buscarPorId(id: number): Observable<Proyecto> {
    return this.http.get<Proyecto>(`${this.baseUrl}/${id}`);
  }

  crear(proyecto: ProyectoInput): Observable<Proyecto> {
    return this.http.post<Proyecto>(this.baseUrl, proyecto);
  }

  actualizar(id: number, cambios: ProyectoInput): Observable<Proyecto> {
    return this.http.put<Proyecto>(`${this.baseUrl}/${id}`, cambios);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // Seguimiento: conteo de tareas por estado + % de avance.
  progreso(id: number): Observable<Progreso> {
    return this.http.get<Progreso>(`${this.baseUrl}/${id}/progreso`);
  }

  // Rendimiento: duración real (historial de estados) vs. planificada, por tarea.
  rendimiento(id: number): Observable<Rendimiento> {
    return this.http.get<Rendimiento>(`${this.baseUrl}/${id}/rendimiento`);
  }
}
