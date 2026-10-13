import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { DatosImportacion, Previsualizacion } from '../models/presupuesto.model';
import { Proyecto } from '../models/proyecto.model';

// Alta de proyectos desde el Excel de presupuesto: previsualizar (no guarda nada) y después
// importar el mismo archivo con los datos confirmados. El backend vuelve a leer el archivo.
@Injectable({ providedIn: 'root' })
export class ImportacionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/proyectos';

  previsualizar(archivo: File): Observable<Previsualizacion> {
    const form = new FormData();
    form.append('archivo', archivo);
    return this.http.post<Previsualizacion>(`${this.baseUrl}/importacion/previsualizar`, form);
  }

  importar(archivo: File, datos: DatosImportacion): Observable<Proyecto> {
    const form = new FormData();
    form.append('archivo', archivo);
    form.append('datos', new Blob([JSON.stringify(datos)], { type: 'application/json' }));
    return this.http.post<Proyecto>(`${this.baseUrl}/importacion`, form);
  }

  descargarPlantilla(): Observable<void> {
    return this.descargar(`${this.baseUrl}/importacion/plantilla`, 'Planilla modelo de proyecto.xls');
  }

  // Excel del que se importó el proyecto.
  descargarExcelOriginal(proyectoId: number, nombre: string): Observable<void> {
    return this.descargar(`${this.baseUrl}/${proyectoId}/excel`, nombre);
  }

  // Las descargas pasan por HttpClient (y no por un <a href>) para que lleven el token.
  private descargar(url: string, nombre: string): Observable<void> {
    return this.http.get(url, { responseType: 'blob' }).pipe(
      map((blob) => {
        const enlace = document.createElement('a');
        enlace.href = URL.createObjectURL(blob);
        enlace.download = nombre;
        enlace.click();
        URL.revokeObjectURL(enlace.href);
      }),
    );
  }
}
