import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { rolGuard } from './core/guards/rol.guard';

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
        path: 'tareas',
        loadComponent: () => import('./pages/tareas/tareas.component').then((m) => m.TareasComponent),
      },
      {
        // Patrón para proteger una view por rol: rolGuard(...roles) acá, y los mismos roles
        // en su entrada de MENU_ITEMS (layout/shell.component.ts) para que no aparezca en el menú.
        path: 'usuarios',
        canActivate: [rolGuard('ADMINISTRADOR')],
        loadComponent: () =>
          import('./pages/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
