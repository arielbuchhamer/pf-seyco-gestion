import { Component, inject } from '@angular/core';
import { SnackbarService } from './snackbar.service';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  template: `
    @if (snackbar.aviso(); as aviso) {
      <div class="snackbar" [class.snackbar--error]="aviso.tipo === 'error'" role="status" aria-live="polite">
        <span class="snackbar__icono" aria-hidden="true">{{ aviso.tipo === 'error' ? '!' : '✓' }}</span>
        <span>{{ aviso.mensaje }}</span>
      </div>
    }
  `,
  styles: `
    .snackbar {
      position: fixed;
      left: 50%;
      bottom: 1.5rem;
      transform: translateX(-50%);
      z-index: 20;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      max-width: min(30rem, 92vw);
      padding: 0.75rem 1.1rem;
      border-radius: var(--radius-sm);
      background: var(--color-ink);
      color: #fff;
      font-size: 0.9rem;
      box-shadow: var(--shadow-card);
      animation: entrar 0.2s ease-out;
    }
    .snackbar__icono {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.3rem;
      height: 1.3rem;
      border-radius: 999px;
      background: var(--color-success);
      font-weight: 700;
      font-size: 0.75rem;
      flex-shrink: 0;
    }
    .snackbar--error .snackbar__icono {
      background: var(--color-danger);
    }
    @keyframes entrar {
      from {
        opacity: 0;
        transform: translate(-50%, 0.5rem);
      }
    }
  `,
})
export class SnackbarComponent {
  protected readonly snackbar = inject(SnackbarService);
}
