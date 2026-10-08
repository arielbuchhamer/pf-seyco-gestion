import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Usuario, UsuarioInput, UsuarioListado } from '../models/usuario.model';

// Módulo `usuarios` en el backend (GET leer, POST escribir, PUT/DELETE editar).
// El rol de cada usuario se asigna con RolService.asignarUsuario / desasignarUsuario.
@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/usuarios';

  listar(): Observable<UsuarioListado[]> {
    return this.http.get<UsuarioListado[]>(this.baseUrl);
  }

  crear(usuario: UsuarioInput): Observable<Usuario> {
    return this.http.post<Usuario>(this.baseUrl, usuario);
  }

  actualizar(id: number, cambios: UsuarioInput): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.baseUrl}/${id}`, cambios);
  }

  // Baja lógica: el usuario deja de poder iniciar sesión y sus sesiones abiertas se cierran.
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
