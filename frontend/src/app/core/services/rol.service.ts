import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Modulo, Panel, PermisoModulo, Rol, RolModulo, RolPanel } from '../models/acceso.model';

// Roles, sus asociaciones y los catálogos de módulos y paneles. En el backend todo exige el
// módulo `roles` (GET leer, POST escribir, PUT/DELETE editar).
@Injectable({ providedIn: 'root' })
export class RolService {
  private readonly http = inject(HttpClient);

  // --- ROLES ---

  listar(): Observable<Rol[]> {
    return this.http.get<Rol[]>('/api/roles');
  }

  crear(rol: Omit<Rol, 'id'>): Observable<Rol> {
    return this.http.post<Rol>('/api/roles', rol);
  }

  actualizar(id: number, rol: Omit<Rol, 'id'>): Observable<Rol> {
    return this.http.put<Rol>(`/api/roles/${id}`, rol);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`/api/roles/${id}`);
  }

  // --- MÓDULOS DEL ROL (los permisos se cambian, y se quitan, con PUT) ---

  modulosDelRol(idRol: number): Observable<RolModulo[]> {
    return this.http.get<RolModulo[]>(`/api/roles/${idRol}/modulos`);
  }

  asignarModulo(idRol: number, idModulo: number, permisos: PermisoModulo): Observable<RolModulo> {
    return this.http.post<RolModulo>(`/api/roles/${idRol}/modulos`, { idModulo, ...permisos });
  }

  actualizarModulo(idRol: number, idModulo: number, permisos: PermisoModulo): Observable<RolModulo> {
    return this.http.put<RolModulo>(`/api/roles/${idRol}/modulos/${idModulo}`, { idModulo, ...permisos });
  }

  // --- PANELES DEL ROL ---

  panelesDelRol(idRol: number): Observable<RolPanel[]> {
    return this.http.get<RolPanel[]>(`/api/roles/${idRol}/paneles`);
  }

  asignarPanel(idRol: number, idPanel: number): Observable<RolPanel> {
    return this.http.post<RolPanel>(`/api/roles/${idRol}/paneles`, { idPanel });
  }

  desasignarPanel(idRol: number, idPanel: number): Observable<void> {
    return this.http.delete<void>(`/api/roles/${idRol}/paneles/${idPanel}`);
  }

  // --- USUARIOS DEL ROL ---

  asignarUsuario(idRol: number, idUsuario: number): Observable<void> {
    return this.http.post<void>(`/api/roles/${idRol}/usuarios`, { idUsuario });
  }

  desasignarUsuario(idRol: number, idUsuario: number): Observable<void> {
    return this.http.delete<void>(`/api/roles/${idRol}/usuarios/${idUsuario}`);
  }

  // --- CATÁLOGOS (tipo 'modulos' -> /api/modulos, 'paneles' -> /api/paneles) ---

  listarCatalogo(tipo: 'modulos' | 'paneles'): Observable<(Modulo | Panel)[]> {
    return this.http.get<(Modulo | Panel)[]>(`/api/${tipo}`);
  }

  crearEnCatalogo(tipo: 'modulos' | 'paneles', nombre: string): Observable<Modulo | Panel> {
    return this.http.post<Modulo | Panel>(`/api/${tipo}`, { nombre });
  }

  actualizarEnCatalogo(tipo: 'modulos' | 'paneles', id: number, nombre: string): Observable<Modulo | Panel> {
    return this.http.put<Modulo | Panel>(`/api/${tipo}/${id}`, { nombre });
  }

  eliminarDeCatalogo(tipo: 'modulos' | 'paneles', id: number): Observable<void> {
    return this.http.delete<void>(`/api/${tipo}/${id}`);
  }
}
