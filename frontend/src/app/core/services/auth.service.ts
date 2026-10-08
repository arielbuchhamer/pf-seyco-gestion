import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { Accion, Mensaje, Permisos, RespuestaAuth, SIN_PERMISOS } from '../models/acceso.model';
import { UsuarioSesion } from '../models/usuario.model';

const TOKEN_KEY = 'auth_token';

// Sesión con token opaco (tabla `sesiones` del backend): se guarda en localStorage y viaja en
// el header Authorization: Bearer (ver auth.interceptor.ts). Su duración la define el rol
// (roles.token_duracion); al vencer, cualquier pedido devuelve 401 y se vuelve al login.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/auth';

  readonly currentUser = signal<UsuarioSesion | null>(null);
  readonly permisos = signal<Permisos>(SIN_PERMISOS);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  // ¿Puede hacer `accion` sobre el módulo? Para templates, preferir *puede="'modulo:accion'".
  // Lee el signal, así que dentro de computed()/httpResource() se re-evalúa solo al cambiar los permisos.
  // Es sólo UX: quien protege de verdad es el @PreAuthorize del endpoint en el backend.
  puede(modulo: string, accion: Accion): boolean {
    return this.permisos().modulos[modulo.toLowerCase()]?.[accion] === true;
  }

  // ¿Puede entrar a esa pantalla? (paneles asignados a sus roles)
  puedeVerPanel(panel: string): boolean {
    return this.permisos().paneles.includes(panel);
  }

  login(email: string, contrasena: string): Observable<RespuestaAuth> {
    return this.http.post<RespuestaAuth>(`${this.baseUrl}/login`, { email, contrasena }).pipe(
      tap((respuesta) => {
        if (respuesta.token) {
          this.guardarToken(respuesta.token);
        }
        this.aplicar(respuesta);
      }),
    );
  }

  // Nunca falla: aunque el backend no responda (o la sesión ya haya vencido), la sesión local se limpia.
  logout(): Observable<void> {
    return this.http.post<Mensaje>(`${this.baseUrl}/logout`, {}).pipe(
      catchError(() => of(null)),
      map(() => this.limpiarSesion()),
    );
  }

  // Valida el token guardado y trae usuario y permisos frescos (refleja cambios hechos en
  // Roles sin volver a iniciar sesión).
  checkSession(): Observable<UsuarioSesion | null> {
    if (!this.getToken()) {
      this.limpiarSesion();
      return of(null);
    }
    return this.http.get<RespuestaAuth>(`${this.baseUrl}/me`).pipe(
      tap((respuesta) => this.aplicar(respuesta)),
      map((respuesta) => respuesta.usuario),
      catchError(() => {
        this.limpiarSesion();
        return of(null);
      }),
    );
  }

  // Recuperación de contraseña: 1) pide el link por correo  2) guarda la nueva con el token del link.
  solicitarRecuperacion(email: string): Observable<Mensaje> {
    return this.http.post<Mensaje>(`${this.baseUrl}/recuperar`, { email });
  }

  restablecerContrasena(token: string, contrasena: string): Observable<Mensaje> {
    return this.http.post<Mensaje>(`${this.baseUrl}/restablecer`, { token, contrasena });
  }

  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  limpiarSesion(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Sin acceso a localStorage no hay nada guardado que borrar.
    }
    this.currentUser.set(null);
    this.permisos.set(SIN_PERMISOS);
  }

  private guardarToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Sin localStorage la sesión dura hasta recargar la página.
    }
  }

  private aplicar(respuesta: RespuestaAuth): void {
    this.currentUser.set(respuesta.usuario);
    this.permisos.set(respuesta.permisos ?? SIN_PERMISOS);
  }
}
