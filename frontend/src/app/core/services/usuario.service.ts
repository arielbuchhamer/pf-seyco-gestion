import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Usuario, UsuarioInput } from '../models/usuario.model';

// Endpoints admin-only (ver SecurityConfig.requestMatchers("/api/usuarios/**").hasRole("ADMINISTRADOR")).
@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/usuarios';

  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.baseUrl);
  }

  crear(usuario: UsuarioInput): Observable<Usuario> {
    return this.http.post<Usuario>(this.baseUrl, usuario);
  }

  actualizar(id: number, cambios: UsuarioInput): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.baseUrl}/${id}`, cambios);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
