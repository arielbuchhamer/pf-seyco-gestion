import { httpResource } from '@angular/common/http';
import { Component, computed, input, signal } from '@angular/core';
import { Proyecto } from '../../core/models/proyecto.model';
import { ProyectoFilaComponent } from './proyecto-fila.component';

// "Últimos proyectos": todos, los más recientes primero, con buscador por nombre o cliente.
// Ocupa el alto de la columna y scrollea adentro.
@Component({
  selector: 'app-ultimos-proyectos',
  standalone: true,
  imports: [ProyectoFilaComponent],
  template: `
    <section class="panel ultimos">
      <div class="panel__cabecera">
        <h2 class="panel__titulo">Últimos proyectos</h2>
        @if (proyectos().length) {
          <span class="cantidad">{{ proyectos().length }} {{ proyectos().length === 1 ? 'proyecto' : 'proyectos' }}</span>
        }
      </div>
      <label class="buscador">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
        <span class="sr-only">Buscar proyecto</span>
        <input type="search" placeholder="Buscar por nombre o cliente" [value]="busqueda()" (input)="busqueda.set($any($event.target).value)" />
      </label>
      @if (proyectosResource.error()) {
        <p class="error" role="alert">No se pudo cargar la lista de proyectos.</p>
      }
      <div class="lista">
        @for (proyecto of visibles(); track proyecto.id) {
          <app-proyecto-fila [proyecto]="proyecto" [nuevo]="proyecto.id === nuevoId()" />
        } @empty {
          @if (!proyectosResource.isLoading()) {
            <p class="muted">
              {{ busqueda() ? 'Ningún proyecto coincide con «' + busqueda() + '».' : 'Todavía no hay proyectos.' }}
            </p>
          }
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
    .ultimos {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }
    .cantidad {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-muted);
      background: #eef0f4;
      border-radius: 999px;
      padding: 2px 9px;
    }
    .lista {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      margin: 0 -0.6rem;
      padding: 0 0.6rem;
      display: flex;
      flex-direction: column;
    }
    .lista > * + * {
      border-top: 1px solid #eef0f4;
    }
    .muted {
      font-size: 0.875rem;
    }
  `,
})
export class UltimosProyectosComponent {
  // Proyecto recién importado: se marca "Nuevo".
  readonly nuevoId = input<number | null>(null);

  protected readonly busqueda = signal('');

  protected readonly proyectosResource = httpResource<Proyecto[]>(() => '/api/proyectos', { defaultValue: [] });

  protected readonly proyectos = computed(() => [...this.proyectosResource.value()].sort((a, b) => b.id - a.id));

  protected readonly visibles = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    return this.proyectos().filter((p) => !q || `${p.nombre} ${p.cliente ?? ''}`.toLowerCase().includes(q));
  });

  recargar(): void {
    this.proyectosResource.reload();
  }
}
