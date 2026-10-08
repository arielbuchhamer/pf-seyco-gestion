import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Adjunta el token de sesión (Authorization: Bearer) a todos los pedidos. Si el backend
// responde 401 la sesión venció o se cerró (logout en otra pestaña, cambio de contraseña,
// baja del usuario): se limpia y se vuelve al login. En el login, un 401 sólo significa
// credenciales incorrectas.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();

  const pedido = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(pedido).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && token && !req.url.endsWith('/api/auth/login')) {
        auth.limpiarSesion();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
