import { Component, input, model, output } from '@angular/core';
import { Alerta } from '../../core/models/seguimiento.model';
import { Tarea } from '../../core/models/tarea.model';
import { fecha } from '../../core/utils/formato';
import { Semaforo } from '../../core/utils/seguimiento';
import { AvisosComponent } from '../../shared/alertas/avisos.component';
import { PaginadorComponent, paginacion } from '../../shared/paginador/paginador.component';

export interface TareaDesviada {
  tarea: Tarea;
  avance: number;
  desvio: number | null;
  semaforo: Semaforo | null;
  fin: string | null;
}

export type SolapaDesvios = 'tareas' | 'avisos';

// Columna a la derecha del Gantt (20 % del ancho): el detalle completo sin salir de la obra. Dos
// solapas: las tareas desviadas (de a 10; al elegir una, el Gantt va a esa fila) y todos los avisos
// de la obra (los mismos de la pantalla Avisos).
@Component({
  selector: 'app-proyecto-desvios',
  standalone: true,
  imports: [AvisosComponent, PaginadorComponent],
  template: `
    <section class="panel lateral" aria-labelledby="desvios-titulo">
      <h2 id="desvios-titulo" class="lateral__titulo">Desvíos y avisos</h2>

      <div class="solapas" role="tablist">
        <button type="button" role="tab" [attr.aria-selected]="solapa() === 'tareas'" [class.activa]="solapa() === 'tareas'"
          (click)="solapa.set('tareas')">Desvíos <span class="contador">{{ desviadas().length }}</span></button>
        <button type="button" role="tab" [attr.aria-selected]="solapa() === 'avisos'" [class.activa]="solapa() === 'avisos'"
          (click)="solapa.set('avisos')">Avisos <span class="contador">{{ alertas()?.length ?? '…' }}</span></button>
      </div>

      <div class="lateral__cuerpo">
        @if (solapa() === 'tareas') {
          @if (!lineaBase()) {
            <p class="muted">Los desvíos se miden después de fijar la línea base (solapa Carga de fechas).</p>
          } @else if (!desviadas().length) {
            <p class="muted">Ninguna tarea atrasada: todas vienen en fecha.</p>
          } @else {
            <div class="avisos__lista">
              <p class="ayuda">Tocá una tarea para verla en el cronograma.</p>
              @for (f of paginas.pagina().items; track f.tarea.id) {
                <button type="button" [class]="'aviso aviso--' + (f.semaforo === 'critico' ? 'critica' : 'advertencia')"
                  (click)="ir.emit(f.tarea.id)">
                  <span class="aviso__icono" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20z"></path><path d="M12 10v4M12 17h.01"></path></svg>
                  </span>
                  <div class="aviso__texto">
                    <strong>Tarea {{ f.tarea.numero }} · +{{ f.desvio }} {{ f.desvio === 1 ? 'día' : 'días' }}</strong>
                    <p>{{ f.tarea.nombre }} — fin estimado {{ fecha(f.fin) }} ({{ f.avance }} %)</p>
                  </div>
                </button>
              }
              <app-paginador [pagina]="paginas.pagina()" [compacto]="true" (cambiar)="paginas.actual.set($event)" />
            </div>
          }
        } @else {
          @if (alertas(); as a) {
            <app-avisos [alertas]="a" [mostrarFecha]="true" vacio="La obra no tiene avisos: viene bien en plazo, costos y cobros." />
          } @else {
            <p class="muted">Cargando avisos…</p>
          }
        }
      </div>
    </section>
  `,
  styles: `
    :host { display: block; min-width: 0; min-height: 0; }
    .lateral { display: flex; flex-direction: column; height: 100%; padding: 0; overflow: hidden; }
    .lateral__titulo { margin: 0; padding: 0.9rem 1rem 0.5rem; font-size: var(--texto-destacado); color: var(--color-ink); }
    .solapas { display: flex; gap: 0.15rem; padding: 0 0.75rem; border-bottom: 1px solid var(--color-border); }
    .solapas button {
      font: inherit; font-size: var(--texto-secundario); font-weight: 600;
      display: inline-flex; align-items: center; gap: 0.35rem;
      padding: 0.5rem 0.5rem; margin-bottom: -1px;
      border: 0; border-bottom: 2px solid transparent; background: none;
      color: var(--color-text-muted); cursor: pointer;
    }
    .solapas button.activa { color: var(--color-primary); border-bottom-color: var(--color-primary); }
    .contador { padding: 0 0.4rem; border-radius: 999px; font-size: var(--texto-chico); background: color-mix(in srgb, var(--color-text-muted) 16%, transparent); color: var(--color-text); }
    .lateral__cuerpo { flex: 1; min-height: 0; overflow-y: auto; padding: 0.75rem; }
    .ayuda { margin: 0; font-size: var(--texto-secundario); color: var(--color-text-muted); }
    button.aviso { font: inherit; width: 100%; text-align: left; cursor: pointer; color: var(--color-ink); border: 0; border-left: 4px solid var(--aviso-color); }
    button.aviso:hover { filter: brightness(0.97); }
    button.aviso p { margin: 0.15rem 0 0; font-size: var(--texto-secundario); color: var(--color-text-muted); }
    /* Los avisos ya van dentro de esta columna: sin la caja propia del componente de avisos. */
    :host ::ng-deep .lateral__cuerpo .panel.avisos { border: 0; box-shadow: none; padding: 0; background: none; }
  `,
})
export class ProyectoDesviosComponent {
  readonly desviadas = input.required<TareaDesviada[]>();
  readonly alertas = input<Alerta[] | null>(null);
  readonly lineaBase = input(false);
  readonly solapa = model<SolapaDesvios>('tareas');
  readonly ir = output<number>();

  protected readonly fecha = fecha;
  protected readonly paginas = paginacion(() => this.desviadas());
}
