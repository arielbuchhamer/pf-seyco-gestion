import { httpResource } from '@angular/common/http';
import { Component, computed, input, model } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ESTADO_PROYECTO_LABEL, EstadoProyecto, TIPO_CLIENTE_LABEL, TIPO_OBRA_LABEL, TipoCliente } from '../../core/models/proyecto.model';
import { Portafolio, ResumenProyecto } from '../../core/models/seguimiento.model';
import { fecha, iniciales, numero, pesosCorto } from '../../core/utils/formato';
import { enRango, semaforoDesvio } from '../../core/utils/seguimiento';

export type CampoOrden = 'recientes' | 'nombre' | 'inicio' | 'fin' | 'presupuesto' | 'avance';
export interface Orden {
  campo: CampoOrden;
  asc: boolean;
}

export const OPCIONES_ORDEN: { campo: CampoOrden; texto: string; asc: boolean }[] = [
  { campo: 'recientes', texto: 'Más recientes', asc: false },
  { campo: 'inicio', texto: 'Fecha de inicio', asc: false },
  { campo: 'fin', texto: 'Fecha de fin', asc: true },
  { campo: 'nombre', texto: 'Nombre (A-Z)', asc: true },
  { campo: 'presupuesto', texto: 'Presupuesto', asc: false },
  { campo: 'avance', texto: 'Avance', asc: false },
];

// Listado de proyectos de la pantalla Proyectos (la parte grande). Sale de GET /api/portafolio
// (trae presupuesto, avance y plazo de cada obra en un solo pedido); los filtros de la cabecera
// y el orden se aplican acá. Clic en el título de una columna ordena por ella.
@Component({
  selector: 'app-listado-proyectos',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="panel listado">
      <div class="tablero__cabecera">
        <h3>Proyectos</h3>
        <span class="muted chico">{{ visibles().length }} de {{ todos().length }}</span>
      </div>
      @if (recurso.error()) {
        <p class="error" role="alert">No se pudo cargar la lista de proyectos.</p>
      }
      <div class="listado__scroll">
        <table class="tabla-obras">
          <thead>
            <tr>
              @for (c of columnas; track c.campo) {
                <th [class.num]="c.num" [attr.aria-sort]="orden().campo === c.campo ? (orden().asc ? 'ascending' : 'descending') : null">
                  <button type="button" class="orden" [class.orden--activo]="orden().campo === c.campo" (click)="ordenarPor(c.campo)">
                    {{ c.texto }}<span aria-hidden="true">{{ orden().campo === c.campo ? (orden().asc ? ' ↑' : ' ↓') : '' }}</span>
                  </button>
                </th>
              }
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (p of visibles(); track p.id) {
              <tr [class.nuevo]="p.id === nuevoId()">
                <td>
                  <a class="obra-link obra" [routerLink]="['/proyectos', p.id]">
                    <span [class]="'inicial inicial--' + p.estado.toLowerCase()" aria-hidden="true">{{ inicial(p) }}</span>
                    <span>
                      {{ p.nombre }}
                      @if (p.id === nuevoId()) {
                        <span class="badge badge--ok">Nuevo</span>
                      }
                      <span class="muted chico bloque">{{ p.cliente ?? 'Sin cliente' }}{{ p.tipoCliente ? ' · ' + tipoClienteLabel[p.tipoCliente] : '' }}{{ p.tipoObra ? ' · ' + tipoObraLabel[p.tipoObra] : '' }}</span>
                    </span>
                  </a>
                </td>
                <td>{{ fecha(p.fechaInicio) }}</td>
                <td>{{ fecha(p.fechaFin) }}</td>
                <td class="num">{{ pesosCorto(p.presupuesto) }}</td>
                <td>
                  <div class="mini">
                    <div class="mini__barra"><div class="mini__real" [style.width.%]="p.avanceReal"></div></div>
                    <span class="chico">{{ redondo(p.avanceReal) }} %</span>
                  </div>
                </td>
                <td>
                  <span [class]="'badge badge--' + p.estado.toLowerCase()">{{ estadoLabel[p.estado] }}</span>
                  @if ((p.desvioDias ?? 0) > 0) {
                    <span [class]="'badge badge--' + (semaforo(p.desvioDias) ?? 'riesgo')">{{ p.desvioDias }} d tarde</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="muted">
                  {{ recurso.isLoading() ? 'Cargando…' : todos().length ? 'Ningún proyecto coincide con los filtros.' : 'Todavía no hay proyectos: importá el primero.' }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: `
    :host { display: flex; min-height: 0; }
    .listado { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 0.9rem 1.1rem 0.4rem; }
    .listado__scroll { flex: 1; min-height: 0; overflow: auto; }
    .orden { border: 0; background: none; padding: 0; font: inherit; color: inherit; cursor: pointer; white-space: nowrap; }
    .orden:hover, .orden--activo { color: var(--color-primary-dark); }
    .obra { display: flex; align-items: center; gap: 0.65rem; }
    .bloque { display: block; font-weight: 400; }
    .obra .badge { margin-left: 0.35rem; }
    .inicial { width: 34px; height: 34px; flex: none; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; }
    .inicial--planificado { background: #eceef2; color: #4b5563; }
    .inicial--en_curso { background: #e6eef8; color: var(--color-primary-dark); }
    .inicial--finalizado { background: #e6f4ec; color: var(--color-success-dark); }
    tr.nuevo { background: #f0f8f3; }
    td .badge + .badge { margin-left: 0.3rem; }
  `,
})
export class ListadoProyectosComponent {
  // Filtros de la cabecera de la pantalla.
  readonly desde = input('');
  readonly hasta = input('');
  readonly busqueda = input('');
  readonly estados = input<EstadoProyecto[]>([]);
  readonly clientes = input<TipoCliente[]>([]);
  readonly orden = model<Orden>({ campo: 'recientes', asc: false });
  // Proyecto recién importado: se marca "Nuevo".
  readonly nuevoId = input<number | null>(null);

  protected readonly recurso = httpResource<Portafolio>(() => '/api/portafolio');

  protected readonly fecha = fecha;
  protected readonly pesosCorto = pesosCorto;
  protected readonly estadoLabel = ESTADO_PROYECTO_LABEL;
  protected readonly tipoClienteLabel = TIPO_CLIENTE_LABEL;
  protected readonly tipoObraLabel = TIPO_OBRA_LABEL;
  protected readonly semaforo = semaforoDesvio;

  protected readonly columnas: { campo: CampoOrden; texto: string; num?: boolean }[] = [
    { campo: 'nombre', texto: 'Proyecto' },
    { campo: 'inicio', texto: 'Inicio' },
    { campo: 'fin', texto: 'Fin' },
    { campo: 'presupuesto', texto: 'Presupuesto', num: true },
    { campo: 'avance', texto: 'Avance' },
  ];

  protected readonly todos = computed(() => this.recurso.value()?.proyectos ?? []);

  protected readonly visibles = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const { campo, asc } = this.orden();
    const lista = this.todos().filter(
      (p) =>
        (!q || `${p.nombre} ${p.cliente ?? ''}`.toLowerCase().includes(q)) &&
        (!this.estados().length || this.estados().includes(p.estado)) &&
        (!this.clientes().length || (p.tipoCliente != null && this.clientes().includes(p.tipoCliente))) &&
        enRango(p.fechaInicio, this.desde(), this.hasta()),
    );
    const valor = (p: ResumenProyecto): string | number => {
      switch (campo) {
        case 'nombre': return p.nombre.toLowerCase();
        case 'inicio': return p.fechaInicio ?? '';
        case 'fin': return p.fechaFin ?? '';
        case 'presupuesto': return p.presupuesto;
        case 'avance': return p.avanceReal;
        default: return p.id;
      }
    };
    return [...lista].sort((a, b) => {
      const va = valor(a);
      const vb = valor(b);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return asc ? cmp : -cmp;
    });
  });

  // Primer clic: el orden natural de la columna; otro clic en la misma, lo invierte.
  ordenarPor(campo: CampoOrden): void {
    const actual = this.orden();
    const natural = OPCIONES_ORDEN.find((o) => o.campo === campo)?.asc ?? true;
    this.orden.set({ campo, asc: actual.campo === campo ? !actual.asc : natural });
  }

  inicial(p: ResumenProyecto): string {
    return iniciales(p.nombre);
  }

  redondo(valor: number): string {
    return numero(Math.round(valor));
  }

  recargar(): void {
    this.recurso.reload();
  }
}
