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
        // Mi perfil no es una ruta: es un diálogo que abre el shell (shared/perfil).
        // Patrón para proteger una view: panelGuard(panel) acá, y el mismo panel en su entrada
        // de MENU (layout/menu.ts) para que no aparezca en el menú. Qué roles
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
        path: 'proyectos/:id/reporte',
        canActivate: [panelGuard(PANELES.proyectos)],
        loadComponent: () =>
          import('./pages/reporte/reporte-obra.component').then((m) => m.ReporteObraComponent),
      },
      {
        // Gestión global: usa el panel de proyectos (quien ve proyectos ve el portafolio).
        path: 'portafolio',
        canActivate: [panelGuard(PANELES.proyectos)],
        loadComponent: () =>
          import('./pages/portafolio/portafolio.component').then((m) => m.PortafolioComponent),
      },
      {
        // Gestión global, igual que el portafolio: usa el panel de proyectos.
        path: 'cobranzas',
        canActivate: [panelGuard(PANELES.proyectos)],
        loadComponent: () =>
          import('./pages/cobranzas/cobranzas.component').then((m) => m.CobranzasComponent),
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
