import { Component, computed, input } from '@angular/core';
import { Usuario, nombreCompleto } from '../../core/models/usuario.model';
import { AvatarComponent } from './avatar.component';

// Fila de avatares superpuestos con "+N" al final (prototipo: tarjetas del listado de proyectos).
@Component({
  selector: 'app-avatar-group',
  standalone: true,
  imports: [AvatarComponent],
  template: `
    @for (usuario of visibles(); track usuario.id) {
      <app-avatar [usuario]="usuario" />
    }
    @if (restantes() > 0) {
      <span class="avatar-group__mas" [title]="nombresRestantes()">+{{ restantes() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
    }
    :host > * + * {
      margin-left: -0.45rem;
    }
    .avatar-group__mas {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.6rem;
      height: 1.6rem;
      padding: 0 0.3rem;
      border-radius: 999px;
      font-size: 0.65rem;
      font-weight: 600;
      color: var(--color-danger);
      background: color-mix(in srgb, var(--color-danger) 14%, var(--color-surface));
      box-shadow: 0 0 0 2px var(--color-surface);
    }
  `,
})
export class AvatarGroupComponent {
  readonly usuarios = input.required<Usuario[]>();
  readonly max = input(3);

  protected readonly visibles = computed(() => this.usuarios().slice(0, this.max()));
  protected readonly restantes = computed(() => Math.max(0, this.usuarios().length - this.max()));
  protected readonly nombresRestantes = computed(() =>
    this.usuarios().slice(this.max()).map(nombreCompleto).join(', '),
  );
}
