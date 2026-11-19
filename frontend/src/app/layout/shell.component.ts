import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { FaqDialogComponent } from '../shared/faq/faq-dialog.component';
import { PerfilDialogComponent } from '../shared/perfil/perfil-dialog.component';
import { SnackbarComponent } from '../shared/snackbar/snackbar.component';
import { IconoMenuComponent } from './icono-menu.component';
import { menuVisible } from './menu';
import { UsuarioMenuComponent } from './usuario-menu.component';

// Las opciones del menú están en layout/menu.ts (compartidas con el menú principal).
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    SnackbarComponent,
    UsuarioMenuComponent,
    FaqDialogComponent,
    PerfilDialogComponent,
    IconoMenuComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(false);
  protected readonly faqOpen = signal(false);
  protected readonly perfilOpen = signal(false);

  protected readonly secciones = computed(() => menuVisible((panel) => this.auth.puedeVerPanel(panel)));

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
