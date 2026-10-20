import { Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';
import { UsuarioSesion, nombreCompleto } from '../core/models/usuario.model';
import { AvatarComponent } from '../shared/avatar/avatar.component';

// Botón del usuario en la barra superior: al apretarlo despliega Mi perfil, FAQs y Cerrar sesión.
// Se cierra al elegir una opción, al hacer clic afuera o con Escape.
@Component({
  selector: 'app-usuario-menu',
  standalone: true,
  imports: [AvatarComponent],
  template: `
    <button
      type="button"
      class="usuario"
      aria-haspopup="menu"
      [attr.aria-expanded]="abierto()"
      (click)="abierto.set(!abierto())"
    >
      <app-avatar [usuario]="usuario()" tamano="md" />
      <span class="usuario__nombre">{{ nombre() }}</span>
      <svg class="usuario__flecha" [class.usuario__flecha--abierta]="abierto()" viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
        <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    @if (abierto()) {
      <div class="desplegable" role="menu">
        <div class="desplegable__cabecera">
          <strong>{{ nombre() }}</strong>
          <span>{{ usuario().email }}</span>
        </div>
        <button type="button" class="opcion" role="menuitem" (click)="elegir(perfil)">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.6" />
            <path d="M4.5 19.5c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          Mi perfil
        </button>
        <button type="button" class="opcion" role="menuitem" (click)="elegir(faqs)">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6" />
            <path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.4v.4M12 16.6v.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          FAQs
        </button>
        <hr />
        <button type="button" class="opcion opcion--salir" role="menuitem" (click)="elegir(cerrarSesion)">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 4.5h3a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-3M10 16l4-4-4-4M14 12H4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    }
  `,
  styles: `
    :host {
      position: relative;
      margin-left: auto;
    }
    .usuario {
      font: inherit;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.3rem 0.6rem 0.3rem 0.3rem;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      background: none;
      color: var(--color-ink);
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .usuario:hover,
    .usuario[aria-expanded='true'] {
      background: var(--color-bg);
      border-color: var(--color-border);
    }
    .usuario__flecha {
      color: var(--color-text-muted);
      transition: transform 0.15s ease;
    }
    .usuario__flecha--abierta {
      transform: rotate(180deg);
    }
    .desplegable {
      position: absolute;
      right: 0;
      top: calc(100% + 0.5rem);
      z-index: 12;
      min-width: 15rem;
      padding: 0.4rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-card);
      animation: aparecer 0.15s ease-out;
    }
    .desplegable__cabecera {
      display: flex;
      flex-direction: column;
      padding: 0.5rem 0.65rem 0.6rem;
      margin-bottom: 0.25rem;
      border-bottom: 1px solid var(--color-border);
      font-size: 0.85rem;
      color: var(--color-ink);
    }
    .desplegable__cabecera span {
      color: var(--color-text-muted);
      font-size: 0.8rem;
    }
    .opcion {
      font: inherit;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      width: 100%;
      padding: 0.6rem 0.65rem;
      border: 0;
      border-radius: var(--radius-sm);
      background: none;
      color: var(--color-text);
      font-size: 0.9rem;
      text-align: left;
      cursor: pointer;
    }
    .opcion svg {
      width: 18px;
      height: 18px;
      color: var(--color-text-muted);
      flex-shrink: 0;
    }
    .opcion:hover:not(:disabled) {
      background: var(--color-bg);
    }
    .opcion:disabled {
      cursor: default;
      opacity: 0.6;
    }
    .opcion--salir,
    .opcion--salir svg {
      color: var(--color-danger);
    }
    .opcion--salir:hover {
      background: color-mix(in srgb, var(--color-danger) 8%, transparent) !important;
    }
    hr {
      border: 0;
      border-top: 1px solid var(--color-border);
      margin: 0.25rem 0;
    }
    @keyframes aparecer {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
    }
    @media (max-width: 640px) {
      .usuario__nombre {
        display: none;
      }
    }
  `,
})
export class UsuarioMenuComponent {
  private readonly elemento = inject(ElementRef<HTMLElement>);

  readonly usuario = input.required<UsuarioSesion>();
  readonly perfil = output<void>();
  readonly faqs = output<void>();
  readonly cerrarSesion = output<void>();

  protected readonly abierto = signal(false);

  protected nombre(): string {
    return nombreCompleto(this.usuario());
  }

  protected elegir(accion: { emit: () => void }): void {
    this.abierto.set(false);
    accion.emit();
  }

  @HostListener('document:click', ['$event'])
  protected clicAfuera(evento: MouseEvent): void {
    if (this.abierto() && !this.elemento.nativeElement.contains(evento.target as Node)) {
      this.abierto.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected escape(): void {
    this.abierto.set(false);
  }
}
