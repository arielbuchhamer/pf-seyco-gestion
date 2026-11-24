import { Component, ElementRef, afterNextRender, inject, input, output } from '@angular/core';
import { UsuarioSesion, iniciales, nombreCompleto } from '../core/models/usuario.model';

// Dónde se coloca la tarjeta (coordenadas de la ventana, en px). 'arriba': barra expandida, la
// tarjeta queda encima del bloque del usuario. 'lado': barra contraída, a la derecha del avatar.
// `flecha` es la distancia desde el borde de la tarjeta hasta el centro de la flechita.
export interface AnclaMenu {
  modo: 'arriba' | 'lado';
  left: number;
  bottom: number;
  ancho: number;
  maxAlto: number;
  flecha: number;
}

// Tarjeta del menú de usuario: Mi perfil, Preguntas frecuentes y Cerrar sesión. La abre y la cierra
// la barra lateral (botón de usuario, Esc, clic afuera y navegación); acá sólo se elige una opción.
@Component({
  selector: 'app-usuario-menu',
  standalone: true,
  host: {
    '[attr.data-modo]': 'ancla().modo',
    '[style.left.px]': 'ancla().left',
    '[style.bottom.px]': 'ancla().bottom',
    '[style.width.px]': 'ancla().ancho',
    '[style.max-height.px]': 'ancla().maxAlto',
    '[style.--flecha.px]': 'ancla().flecha',
  },
  template: `
    <div class="tarjeta" role="menu" aria-label="Menú de usuario" (keydown)="teclado($event)">
      <div class="tarjeta__cabecera">
        <span class="avatar" aria-hidden="true">{{ iniciales() }}</span>
        <span class="tarjeta__datos">
          <strong>{{ nombre() }}</strong>
          <span>{{ rol() }}</span>
        </span>
      </div>
      <button type="button" class="opcion" role="menuitem" (click)="perfil.emit()">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.6" />
          <path
            d="M4.5 19.5c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
        Mi perfil
      </button>
      <button type="button" class="opcion" role="menuitem" (click)="faqs.emit()">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6" />
          <path
            d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.4v.4M12 16.6v.1"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
        Preguntas frecuentes
      </button>
      <hr />
      <button
        type="button"
        class="opcion opcion--salir"
        role="menuitem"
        (click)="cerrarSesion.emit()"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M15 4.5h3a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-3M10 16l4-4-4-4M14 12H4.5"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Cerrar sesión
      </button>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      z-index: 40;
    }
    /* Flechita hacia el bloque del usuario; está en el host para que el scroll de la tarjeta no la corte. */
    :host::after {
      content: '';
      position: absolute;
      width: 10px;
      height: 10px;
      background: var(--color-surface);
      border: 0 solid var(--color-border);
      pointer-events: none;
    }
    :host([data-modo='arriba'])::after {
      left: calc(var(--flecha) - 5px);
      bottom: -5px;
      border-right-width: 1px;
      border-bottom-width: 1px;
      transform: rotate(45deg);
    }
    :host([data-modo='lado'])::after {
      left: -5px;
      bottom: calc(var(--flecha) - 5px);
      border-left-width: 1px;
      border-bottom-width: 1px;
      transform: rotate(45deg);
    }
    .tarjeta {
      max-height: inherit;
      overflow-y: auto;
      padding: 0.4rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 14px;
      box-shadow: var(--shadow-card);
      animation: aparecer 0.15s ease-out;
    }
    .tarjeta__cabecera {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.6rem 0.65rem 0.75rem;
      margin-bottom: 0.25rem;
      border-bottom: 1px solid var(--color-border);
    }
    .avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--color-primary-fondo-oscuro);
      color: #fff;
      font-size: var(--texto-cuerpo);
      font-weight: 600;
    }
    .tarjeta__datos {
      display: flex;
      flex-direction: column;
      min-width: 0;
      color: var(--color-text);
      font-size: var(--texto-cuerpo);
    }
    .tarjeta__datos strong,
    .tarjeta__datos span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tarjeta__datos span {
      color: var(--color-text-muted);
      font-size: var(--texto-secundario);
    }
    .opcion {
      font: inherit;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      width: 100%;
      height: 44px;
      padding: 0 0.65rem;
      border: 0;
      border-radius: var(--radius-sm);
      background: none;
      color: var(--color-text);
      font-size: var(--texto-cuerpo);
      text-align: left;
      cursor: pointer;
    }
    .opcion svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      color: var(--color-text-muted);
    }
    .opcion:hover {
      background: var(--color-bg);
    }
    .opcion:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: -2px;
    }
    .opcion--salir,
    .opcion--salir svg {
      color: #b8352d;
    }
    .opcion--salir:hover {
      background: color-mix(in srgb, #b8352d 8%, transparent);
    }
    hr {
      border: 0;
      border-top: 1px solid var(--color-border);
      margin: 0.25rem 0;
    }
    @keyframes aparecer {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
    }
    :host([data-modo='lado']) .tarjeta {
      animation-name: aparecer-lado;
    }
    @keyframes aparecer-lado {
      from {
        opacity: 0;
        transform: translateX(-4px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .tarjeta,
      :host([data-modo='lado']) .tarjeta {
        animation: none;
      }
    }
  `,
})
export class UsuarioMenuComponent {
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly usuario = input.required<UsuarioSesion>();
  readonly rol = input('');
  readonly ancla = input.required<AnclaMenu>();
  readonly perfil = output<void>();
  readonly faqs = output<void>();
  readonly cerrarSesion = output<void>();

  constructor() {
    afterNextRender(() => this.opciones()[0]?.focus());
  }

  protected nombre(): string {
    return nombreCompleto(this.usuario());
  }

  protected iniciales(): string {
    return iniciales(this.usuario());
  }

  // Flechas, Inicio y Fin recorren las opciones (patrón de menú de WAI-ARIA).
  protected teclado(evento: KeyboardEvent): void {
    const opciones = this.opciones();
    const actual = opciones.indexOf(document.activeElement as HTMLElement);
    let destino: number;
    switch (evento.key) {
      case 'ArrowDown':
        destino = (actual + 1) % opciones.length;
        break;
      case 'ArrowUp':
        destino = (actual - 1 + opciones.length) % opciones.length;
        break;
      case 'Home':
        destino = 0;
        break;
      case 'End':
        destino = opciones.length - 1;
        break;
      default:
        return;
    }
    evento.preventDefault();
    opciones[destino]?.focus();
  }

  private opciones(): HTMLElement[] {
    return Array.from(
      this.elemento.nativeElement.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    );
  }
}
