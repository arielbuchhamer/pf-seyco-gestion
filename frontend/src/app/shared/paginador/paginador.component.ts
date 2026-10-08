import { Component, computed, input, output } from '@angular/core';

export interface Pagina<T> {
  items: T[];
  pagina: number;
  totalPaginas: number;
  total: number;
  desde: number;
  hasta: number;
}

// Corta la lista en páginas (client-side: los listados vienen completos del backend).
export function paginar<T>(lista: T[], pagina: number, porPagina: number): Pagina<T> {
  const total = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const actual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (actual - 1) * porPagina;
  return {
    items: lista.slice(inicio, inicio + porPagina),
    pagina: actual,
    totalPaginas,
    total,
    desde: total === 0 ? 0 : inicio + 1,
    hasta: Math.min(inicio + porPagina, total),
  };
}

// Pie de tabla "1 - 10 de 25 · Página 1 de 3 ‹ ›" (como en el proyecto de referencia).
@Component({
  selector: 'app-paginador',
  standalone: true,
  template: `
    <span>{{ pagina().desde }} - {{ pagina().hasta }} de {{ pagina().total }}</span>
    <span class="paginador__nav">
      <button
        type="button"
        class="icon-btn"
        aria-label="Página anterior"
        [disabled]="pagina().pagina <= 1"
        (click)="cambiar.emit(pagina().pagina - 1)"
      >
        ‹
      </button>
      @if (!compacto()) {
        <span>Página {{ pagina().pagina }} de {{ pagina().totalPaginas }}</span>
      }
      <button
        type="button"
        class="icon-btn"
        aria-label="Página siguiente"
        [disabled]="ultima()"
        (click)="cambiar.emit(pagina().pagina + 1)"
      >
        ›
      </button>
    </span>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.75rem 0.25rem 0;
      font-size: 0.85rem;
      color: var(--color-text-muted);
    }
    .paginador__nav {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .icon-btn {
      margin-left: 0;
      width: 1.9rem;
      height: 1.9rem;
      font-size: 1.1rem;
    }
  `,
})
export class PaginadorComponent {
  readonly pagina = input.required<Pagina<unknown>>();
  // En las tablas angostas (módulos y paneles) se omite "Página X de Y".
  readonly compacto = input(false);
  readonly cambiar = output<number>();

  protected readonly ultima = computed(() => this.pagina().pagina >= this.pagina().totalPaginas);
}
