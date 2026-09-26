import { Component, computed, input } from '@angular/core';
import { Usuario, nombreCompleto } from '../../core/models/usuario.model';

// Colores de fondo de las iniciales: tonos oscuros para que el texto blanco contraste,
// derivados de la paleta de styles.css (azul, verde, cobre) más algunos neutros del rubro.
const COLORES = ['#0f5fa6', '#167a41', '#b0680c', '#6d4bb8', '#0e7c86', '#b23c5a', '#4a5568', '#7a5c1e'];

// Avatar con iniciales y color fijo por usuario (prototipo: fotos en tarjetas y tareas).
// Pensado para sumarle más adelante una foto opcional (ej. input fotoUrl) sin tocar a quien lo usa:
// si no hay foto, se sigue mostrando esto. Sin usuario = tarea "Sin asignar" (círculo punteado).
@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `
    @if (usuario()) {
      <span [class]="'avatar avatar--' + tamano()" [style.background]="color()" [title]="nombre()">
        {{ iniciales() }}
      </span>
    } @else {
      <span [class]="'avatar avatar--vacio avatar--' + tamano()" title="Sin asignar">?</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      color: #fff;
      font-weight: 600;
      letter-spacing: 0.02em;
      user-select: none;
      flex-shrink: 0;
      /* Borde del color de la superficie: separa los avatares superpuestos de app-avatar-group. */
      box-shadow: 0 0 0 2px var(--color-surface);
    }
    .avatar--sm {
      width: 1.6rem;
      height: 1.6rem;
      font-size: 0.65rem;
    }
    .avatar--md {
      width: 2.1rem;
      height: 2.1rem;
      font-size: 0.8rem;
    }
    .avatar--vacio {
      background: var(--color-surface);
      color: var(--color-text-muted);
      border: 1.5px dashed var(--color-border);
    }
  `,
})
export class AvatarComponent {
  readonly usuario = input<Usuario | null | undefined>(null);
  readonly tamano = input<'sm' | 'md'>('sm');

  protected readonly nombre = computed(() => {
    const u = this.usuario();
    return u ? nombreCompleto(u) : '';
  });

  // Nombre + apellido ("Pablo Castro" → "PC"); usuarios anteriores a esos campos, del email.
  protected readonly iniciales = computed(() => {
    const u = this.usuario();
    if (!u) return '';
    if (u.nombre && u.apellido) return (u.nombre[0] + u.apellido[0]).toUpperCase();
    return u.email[0].toUpperCase();
  });

  // Por id (y no por nombre): el color no cambia si se edita el nombre del usuario.
  protected readonly color = computed(() => COLORES[(this.usuario()?.id ?? 0) % COLORES.length]);
}
