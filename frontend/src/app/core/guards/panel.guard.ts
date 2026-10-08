import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Protege una ruta por panel: `canActivate: [panelGuard(PANELES.usuarios)]`. Los paneles de cada
// rol se configuran en la base (roles_paneles) desde la pantalla Roles. Se apoya en que authGuard
// (padre del shell) ya resolvió checkSession() antes, así que los permisos están cargados.
// Sin permiso redirige al dashboard (única ruta que ven todos los roles).
export const panelGuard =
  (panel: string): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return auth.puedeVerPanel(panel) ? true : router.createUrlTree(['/dashboard']);
  };
