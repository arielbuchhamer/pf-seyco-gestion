import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { panelGuard } from './core/guards/panel.guard';
import { PANELES } from './core/models/acceso.model';

export const routes: Routes = [
  {
    // También recibe el link del correo de recuperación: /login?restablecer=<token>
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
        // Sin panelGuard: cualquier rol con sesión entra a su propio perfil.
        path: 'perfil',
        loadComponent: () =>
          import('./pages/perfil/perfil.component').then((m) => m.PerfilComponent),
      },
      {
        // Patrón para proteger una view: panelGuard(panel) acá, y el mismo panel en su entrada
        // de MENU_ITEMS (layout/shell.component.ts) para que no aparezca en el menú. Qué roles
        // ven cada panel se configura en la base (roles_paneles) desde la pantalla Roles.
        path: 'proyectos',
        canActivate: [panelGuard(PANELES.proyectos)],
        loadComponent: () =>
          import('./pages/proyectos/proyectos.component').then((m) => m.ProyectosComponent),
      },
      {
        path: 'proyectos/:id',
        canActivate: [panelGuard(PANELES.proyectos)],
        loadComponent: () =>
          import('./pages/proyecto-detalle/proyecto-detalle.component').then(
            (m) => m.ProyectoDetalleComponent,
          ),
      },
      {
        path: 'tareas',
        canActivate: [panelGuard(PANELES.tareas)],
        loadComponent: () => import('./pages/tareas/tareas.component').then((m) => m.TareasComponent),
      },
      {
        path: 'usuarios',
        canActivate: [panelGuard(PANELES.usuarios)],
        loadComponent: () =>
          import('./pages/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
      },
      {
        path: 'roles',
        canActivate: [panelGuard(PANELES.roles)],
        loadComponent: () => import('./pages/roles/roles.component').then((m) => m.RolesComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
