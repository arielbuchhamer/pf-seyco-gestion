import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { FaqDialogComponent } from '../shared/faq/faq-dialog.component';
import { PerfilDialogComponent } from '../shared/perfil/perfil-dialog.component';
import { SnackbarComponent } from '../shared/snackbar/snackbar.component';
import { SidebarComponent } from './sidebar.component';

// Las opciones del menú están en layout/menu.ts (compartidas con el menú principal) y las muestra
// la barra lateral (layout/sidebar.component.ts).
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    SnackbarComponent,
    SidebarComponent,
    FaqDialogComponent,
    PerfilDialogComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly faqOpen = signal(false);
  protected readonly perfilOpen = signal(false);

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigate(['/login']));
  }
}
