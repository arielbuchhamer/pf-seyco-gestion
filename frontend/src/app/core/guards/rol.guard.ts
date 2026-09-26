import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../models/usuario.model';
import { AuthService } from '../services/auth.service';

// Protege una ruta por rol: `canActivate: [rolGuard('ADMINISTRADOR')]`. Se apoya en que
// authGuard (padre del shell) ya resolvió checkSession() antes, así que currentUser() está poblado.
// Sin permiso redirige al dashboard (única ruta que ven todos los roles).
export const rolGuard =
  (...roles: Rol[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return auth.tieneRol(...roles) ? true : router.createUrlTree(['/dashboard']);
  };
