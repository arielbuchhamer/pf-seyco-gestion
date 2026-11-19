import { Component, input } from '@angular/core';
import { IconoMenu } from './menu';

// Íconos de las opciones del menú (barra lateral y tarjetas del menú principal).
@Component({
  selector: 'app-icono-menu',
  standalone: true,
  template: `
    <svg viewBox="0 0 24 24" [attr.width]="tamano()" [attr.height]="tamano()" fill="none" stroke="currentColor"
      stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @switch (icono()) {
        @case ('usuarios') {
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 19.5c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" />
        }
        @case ('roles') {
          <path d="M12 3.5l7 2.8v5.2c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6.3l7-2.8Z" />
          <path d="M9 12l2 2 4-4" />
        }
        @case ('portafolio') {
          <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
        }
        @case ('cobranzas') {
          <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        }
        @case ('proyectos') {
          <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
          <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
    }
  `,
})
export class IconoMenuComponent {
  readonly icono = input.required<IconoMenu>();
  readonly tamano = input(18);
}
