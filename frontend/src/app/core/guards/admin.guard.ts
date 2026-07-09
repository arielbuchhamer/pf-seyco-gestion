import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Patrón a repetir para futuras rutas admin-only: se apoya en que authGuard (padre del shell)
// ya resolvió checkSession() antes de que este guard corra, así que currentUser() está poblado.
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.currentUser()?.rol === 'ADMINISTRADOR' ? true : router.createUrlTree(['/dashboard']);
};
