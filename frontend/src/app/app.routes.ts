import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'proyectos',
        loadComponent: () =>
          import('./pages/proyectos/proyectos.component').then((m) => m.ProyectosComponent),
      },
      {
        path: 'proyectos/:id',
        loadComponent: () =>
          import('./pages/proyecto-detalle/proyecto-detalle.component').then(
            (m) => m.ProyectoDetalleComponent,
          ),
      },
      {
        // Patrón a repetir para futuras rutas admin-only: canActivate propio además
        // de no aparecer en el menú (ver MENU_ITEMS en layout/shell.component.ts).
        path: 'usuarios',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
