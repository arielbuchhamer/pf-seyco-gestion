import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
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

  // ── Descargas en Excel ──

  // Con los mismos filtros que la pantalla del portafolio.
  descargarPortafolio(params: Record<string, string | string[]>): Observable<void> {
    return this.descargar('/api/portafolio/excel', 'Portafolio.xlsx', params);
  }

  descargarCobranzas(): Observable<void> {
    return this.descargar('/api/cobranzas/excel', 'Cobranzas.xlsx');
  }

  descargarCertificaciones(proyectoId: number, nombre: string): Observable<void> {
    return this.descargar(`${this.url(proyectoId, 'certificaciones')}/excel`, `Certificaciones ${nombre}.xlsx`);
  }

  // Por HttpClient (y no un <a href>) para que la descarga lleve el token. El nombre del archivo
  // sale del encabezado Content-Disposition del backend; si no viene, se usa el sugerido.
  private descargar(url: string, sugerido: string, params: Record<string, string | string[]> = {}): Observable<void> {
    return this.http.get(url, { params, responseType: 'blob', observe: 'response' }).pipe(
      map((respuesta) => {
        const disposicion = respuesta.headers.get('Content-Disposition') ?? '';
        const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposicion);
        const simple = /filename="?([^";]+)"?/i.exec(disposicion);
        const nombre = utf8 ? decodeURIComponent(utf8[1]) : simple ? simple[1] : sugerido;
        const enlace = document.createElement('a');
        enlace.href = URL.createObjectURL(respuesta.body as Blob);
        enlace.download = nombre;
        enlace.click();
        URL.revokeObjectURL(enlace.href);
      }),
    );
  }
}
