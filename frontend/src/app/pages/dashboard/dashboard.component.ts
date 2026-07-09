import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

// Placeholder mínimo: solo existe para poder verificar end-to-end que el guard
// y la cookie de sesión funcionan. Se reemplaza cuando se implemente el dashboard real.
// El logout ahora vive en el shell (layout/shell.component.ts), común a todas las páginas.
@Component({
  selector: 'app-dashboard',
  template: `
    <main style="padding: 2rem; font-family: var(--font-sans)">
      <h1>Hola, {{ auth.currentUser()?.email }}</h1>
      <p>Rol: {{ auth.currentUser()?.rol }}</p>
    </main>
  `,
})
export class DashboardComponent {
  protected readonly auth = inject(AuthService);
}
