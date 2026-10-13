import { httpResource } from '@angular/common/http';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ESTADO_PROYECTO_LABEL, Progreso, Proyecto } from '../../core/models/proyecto.model';
import { fecha, iniciales } from '../../core/utils/formato';

// Fila de "Últimos proyectos": iniciales con el color del estado, nombre y estado arriba,
// cliente · fecha de fin · tareas, y la barra de avance a todo el ancho. El avance no viene en GET /api/proyectos,
// así que cada fila pide su propio progreso.
@Component({
  selector: 'app-proyecto-fila',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a class="fila" [class.fila--nueva]="nuevo()" [routerLink]="['/proyectos', proyecto().id]">
      <span [class]="'inicial inicial--' + estado()" aria-hidden="true">{{ inicial() }}</span>
      <span class="nombre">
        {{ proyecto().nombre }}
        @if (nuevo()) {
          <span class="nuevo">Nuevo</span>
        }
      </span>
      <span [class]="'badge badge--' + estado()">{{ estadoLabel[proyecto().estado] }}</span>
      <span class="meta">{{ meta() }}</span>
      <span class="avance">
        <span class="barra"><span [class]="'relleno relleno--' + estado()" [style.width.%]="avance()"></span></span>
        <span class="pct">{{ avance() }} %</span>
      </span>
    </a>
  `,
  styles: `
    .fila {
      display: grid;
      grid-template-columns: 40px minmax(0, 1fr) auto;
      grid-template-areas:
        'inicial nombre estado'
        'inicial meta   meta'
        'inicial avance avance';
      column-gap: 0.75rem;
      row-gap: 3px;
      align-items: center;
      padding: 0.8rem 0.6rem;
      margin: 0 -0.6rem;
      border-radius: var(--radius-sm);
      text-decoration: none;
      color: inherit;
    }
    .fila:hover {
      background: #f6f8fc;
    }
    .fila--nueva {
      background: #f0f8f3;
    }
    .inicial {
      grid-area: inicial;
      align-self: start;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .inicial--planificado { background: #eceef2; color: #4b5563; }
    .inicial--en_curso { background: #e6eef8; color: var(--color-primary-dark); }
    .inicial--finalizado { background: #e6f4ec; color: var(--color-success-dark); }
    .nombre {
      grid-area: nombre;
      font-weight: 600;
      color: var(--color-ink);
      font-size: 0.875rem;
      line-height: 1.3;
    }
    .badge {
      grid-area: estado;
      align-self: start;
    }
    .nuevo {
      margin-left: 0.4rem;
      font-size: 0.7rem;
      font-weight: 700;
      color: #fff;
      background: var(--color-success);
      padding: 2px 7px;
      border-radius: 999px;
      vertical-align: 1px;
    }
    .meta {
      grid-area: meta;
      font-size: 0.75rem;
      color: var(--color-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .avance {
      grid-area: avance;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-top: 3px;
    }
    .barra {
      flex: 1;
      height: 5px;
      background: var(--color-border);
      border-radius: 999px;
      overflow: hidden;
    }
    .relleno {
      display: block;
      height: 100%;
    }
    .relleno--planificado { background: #9aa1ad; }
    .relleno--en_curso { background: var(--color-primary); }
    .relleno--finalizado { background: var(--color-success); }
    .pct {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      font-variant-numeric: tabular-nums;
      min-width: 2.6rem;
      text-align: right;
    }
  `,
})
export class ProyectoFilaComponent {
  readonly proyecto = input.required<Proyecto>();
  readonly nuevo = input(false);

  protected readonly estadoLabel = ESTADO_PROYECTO_LABEL;

  private readonly progreso = httpResource<Progreso>(() => `/api/proyectos/${this.proyecto().id}/progreso`);

  protected readonly estado = computed(() => this.proyecto().estado.toLowerCase());
  protected readonly inicial = computed(() => iniciales(this.proyecto().nombre));
  protected readonly avance = computed(() => Math.round(this.progreso.value()?.porcentajeAvance ?? 0));

  protected readonly meta = computed(() => {
    const p = this.proyecto();
    const total = this.progreso.value()?.totalTareas;
    const partes = [p.cliente, `Fin ${fecha(p.fechaFin)}`];
    if (total != null) partes.push(total === 0 ? 'sin tareas' : `${total} ${total === 1 ? 'tarea' : 'tareas'}`);
    return partes.filter(Boolean).join(' · ');
  });
}
