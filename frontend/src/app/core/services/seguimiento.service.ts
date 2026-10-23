import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Certificacion, CertificacionInput, CostoReal, CostoRealInput } from '../models/seguimiento.model';

// Altas, cambios y bajas de costos reales y certificaciones de un proyecto. Las consultas
// (portafolio, indicadores, listados) se hacen con httpResource desde cada pantalla.
@Injectable({ providedIn: 'root' })
export class SeguimientoService {
  private readonly http = inject(HttpClient);

  private url(proyectoId: number, recurso: 'costos' | 'certificaciones'): string {
    return `/api/proyectos/${proyectoId}/${recurso}`;
  }

  crearCosto(proyectoId: number, costo: CostoRealInput): Observable<CostoReal> {
    return this.http.post<CostoReal>(this.url(proyectoId, 'costos'), costo);
  }

  actualizarCosto(proyectoId: number, id: number, costo: CostoRealInput): Observable<CostoReal> {
    return this.http.put<CostoReal>(`${this.url(proyectoId, 'costos')}/${id}`, costo);
  }

  eliminarCosto(proyectoId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.url(proyectoId, 'costos')}/${id}`);
  }

  crearCertificacion(proyectoId: number, certificacion: CertificacionInput): Observable<Certificacion> {
    return this.http.post<Certificacion>(this.url(proyectoId, 'certificaciones'), certificacion);
  }

  actualizarCertificacion(proyectoId: number, id: number, certificacion: CertificacionInput): Observable<Certificacion> {
    return this.http.put<Certificacion>(`${this.url(proyectoId, 'certificaciones')}/${id}`, certificacion);
  }

  registrarCobro(proyectoId: number, id: number, fecha: string): Observable<Certificacion> {
    return this.http.patch<Certificacion>(`${this.url(proyectoId, 'certificaciones')}/${id}/cobro`, null, {
      params: { fecha },
    });
  }

  eliminarCertificacion(proyectoId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.url(proyectoId, 'certificaciones')}/${id}`);
  }
}
