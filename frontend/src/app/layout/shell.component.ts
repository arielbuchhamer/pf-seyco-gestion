import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { PANELES } from '../core/models/acceso.model';
import { FaqDialogComponent } from '../shared/faq/faq-dialog.component';
import { SnackbarComponent } from '../shared/snackbar/snackbar.component';
import { UsuarioMenuComponent } from './usuario-menu.component';

interface MenuItem {
  label: string;
  path: string;
  panel: string;
  // Título del grupo en el menú (opcional). Los ítems de un mismo grupo van seguidos.
  seccion?: string;
  icon: 'usuarios' | 'roles' | 'proyectos' | 'tareas' | 'portafolio';
}

// Patrón a repetir: cada opción nueva del menú declara qué panel la habilita (y un ícono, ver
// el @switch en shell.component.html). Debe ser el mismo panel que el panelGuard de su ruta.
// Qué roles ven cada panel se configura en la base (roles_paneles) desde la pantalla Roles.
// "Gestión global" (Portafolio) usa el panel de proyectos: no tiene uno propio en la base.
const MENU_ITEMS: MenuItem[] = [
  { label: 'Portafolio', path: '/portafolio', panel: PANELES.proyectos, seccion: 'Gestión global', icon: 'portafolio' },
  { label: 'Proyectos', path: '/proyectos', panel: PANELES.proyectos, seccion: 'Gestión de proyecto', icon: 'proyectos' },
  { label: 'Tareas', path: '/tareas', panel: PANELES.tareas, seccion: 'Gestión de proyecto', icon: 'tareas' },
  // Igual que el sidebar del proyecto de referencia: Roles y Usuarios agrupados (en la base, sólo admin).
  { label: 'Usuarios', path: '/usuarios', panel: PANELES.usuarios, seccion: 'Gestión de usuarios', icon: 'usuarios' },
  { label: 'Roles', path: '/roles', panel: PANELES.roles, seccion: 'Gestión de usuarios', icon: 'roles' },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SnackbarComponent, UsuarioMenuComponent, FaqDialogComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(false);
  protected readonly faqOpen = signal(false);

  protected readonly visibleMenuItems = computed(() => {
    return MENU_ITEMS.filter((item) => this.auth.puedeVerPanel(item.panel));
  });

  // Se muestra el título del grupo antes del primer ítem de cada sección.
  iniciaSeccion(indice: number): boolean {
    const items = this.visibleMenuItems();
    const seccion = items[indice].seccion;
    return !!seccion && (indice === 0 || items[indice - 1].seccion !== seccion);
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  irAPerfil(): void {
    this.router.navigate(['/perfil']);
  }

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigate(['/login']));
  }
}
