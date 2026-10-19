import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { PerfilInput, Usuario } from '../models/usuario.model';
import { AuthService } from './auth.service';

// /api/perfil: siempre trabaja con el usuario de la sesión (no lleva id). Sin permisos de
// módulo: cualquier rol puede ver y editar su propio perfil.
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = '/api/perfil';

  obtener(): Observable<Usuario> {
    return this.http.get<Usuario>(this.baseUrl);
  }

  // Se mezcla con el usuario de la sesión (en vez de pedir /api/auth/me de nuevo) para que la
  // barra superior y el avatar se actualicen al instante; los roles se conservan porque el PUT
  // no los devuelve.
  actualizar(cambios: PerfilInput): Observable<Usuario> {
    return this.http
      .put<Usuario>(this.baseUrl, cambios)
      .pipe(
        tap((actualizado) =>
          this.auth.currentUser.update((usuario) =>
            usuario ? { ...usuario, ...actualizado } : usuario,
          ),
        ),
      );
  }
}
