import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { Usuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/auth';

  readonly currentUser = signal<Usuario | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  login(email: string, clave: string): Observable<Usuario> {
    return this.http
      .post<Usuario>(`${this.baseUrl}/login`, { email, clave })
      .pipe(tap((usuario) => this.currentUser.set(usuario)));
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/logout`, {})
      .pipe(tap(() => this.currentUser.set(null)));
  }

  checkSession(): Observable<Usuario | null> {
    return this.http.get<Usuario>(`${this.baseUrl}/me`).pipe(
      tap((usuario) => this.currentUser.set(usuario)),
      catchError(() => {
        this.currentUser.set(null);
        return of(null);
      }),
    );
  }
}
