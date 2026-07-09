import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { Rol } from '../core/models/usuario.model';

interface MenuItem {
  label: string;
  path: string;
  roles: Rol[];
  icon: 'usuarios';
}

// Patrón a repetir: cada opción nueva del menú declara qué roles pueden verla (y un ícono, ver
// el @switch en shell.component.html). Hoy solo existe "Usuarios" (admin-only); para USUARIO el
// menú queda vacío a propósito.
const MENU_ITEMS: MenuItem[] = [
  { label: 'Usuarios', path: '/usuarios', roles: ['ADMINISTRADOR'], icon: 'usuarios' },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(false);

  protected readonly visibleMenuItems = computed(() => {
    const rol = this.auth.currentUser()?.rol;
    return MENU_ITEMS.filter((item) => rol != null && item.roles.includes(rol));
  });

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigate(['/login']));
  }
}
