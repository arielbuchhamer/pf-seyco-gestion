import { Component, HostListener, signal } from '@angular/core';

const LADO = 66; // px de cada cuadrado
const PASO = LADO + 6; // con la separación

interface Cuadrado {
  duracion: number;
  demora: number;
  intensidad: number;
}

// Fondo del login: grilla de cuadrados que aparecen y desaparecen (como la página de referencia),
// detrás de toda la pantalla (presentación y tarjeta de ingreso). Cada cuadrado tiene su propia
// duración y demora, así titilan desparejos. La cantidad sale del tamaño de la ventana.
@Component({
  selector: 'app-login-fondo',
  standalone: true,
  template: `
    <div class="cuadros" [style.grid-template-columns]="'repeat(' + columnas() + ', ' + lado + 'px)'">
      @for (c of cuadrados(); track $index) {
        <span [style.animation-duration.s]="c.duracion" [style.animation-delay.s]="c.demora" [style.--intensidad]="c.intensidad"></span>
      }
    </div>
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
    }
    .cuadros {
      position: absolute;
      top: 50%;
      left: 50%;
      display: grid;
      grid-auto-rows: 66px;
      gap: 6px;
      transform: translate(-50%, -50%);
    }
    span {
      border: 1px solid rgba(59, 130, 246, 0.22);
      border-radius: 2px;
      background: rgba(96, 150, 245, 0.1);
      opacity: 0;
      animation-name: titilar;
      animation-timing-function: ease-in-out;
      animation-iteration-count: infinite;
    }
    :host-context([data-tema='oscuro']) span {
      border-color: rgba(96, 150, 245, 0.2);
      background: rgba(96, 150, 245, 0.08);
    }
    @keyframes titilar {
      0%,
      55%,
      100% {
        opacity: 0;
      }
      25% {
        opacity: var(--intensidad);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      span {
        animation: none;
        opacity: calc(var(--intensidad) * 0.35);
      }
    }
  `,
})
export class LoginFondoComponent {
  protected readonly lado = LADO;
  protected readonly columnas = signal(0);
  protected readonly cuadrados = signal<Cuadrado[]>([]);

  constructor() {
    this.armar();
  }

  // Al cambiar el tamaño de la ventana se rearma la grilla (sólo si cambia la cantidad).
  @HostListener('window:resize')
  protected armar(): void {
    const columnas = Math.ceil(window.innerWidth / PASO) + 1;
    const filas = Math.ceil(window.innerHeight / PASO) + 1;
    if (columnas === this.columnas() && filas * columnas === this.cuadrados().length) return;
    this.columnas.set(columnas);
    this.cuadrados.set(
      Array.from({ length: columnas * filas }, () => ({
        duracion: 5 + Math.random() * 6,
        demora: -Math.random() * 11,
        intensidad: 0.35 + Math.random() * 0.4,
      })),
    );
  }
}
