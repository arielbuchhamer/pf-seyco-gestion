import { Component, computed, input, signal } from '@angular/core';
import { Tarea } from '../../core/models/tarea.model';
import { diasEntre, fecha, fechaCorta, hoy, sumarDias } from '../../core/utils/formato';
import { SEMAFORO_LABEL, aplanarTareas, avanceTarea, desvioTarea, finEstimado, semaforoDesvio } from '../../core/utils/seguimiento';

// Solapa "Gantt": por cada tarea, la barra de la línea base (plan) y debajo la real (inicio
// real → fin estimado/real), coloreada según el desvío y rellena según el % de avance. A la
// derecha, las tareas con atraso. Se dibuja con posiciones en % sobre el rango total de fechas.
@Component({
  selector: 'app-proyecto-gantt',
  standalone: true,
  template: `
    <div class="gantt-layout">
      <section class="panel panel--tabla">
        <div class="panel__cabecera">
          <div>
            <h2 class="panel__titulo">Cronograma: línea base vs. real</h2>
            <div class="panel__subtitulo">
              @if (rango(); as r) { {{ fecha(r.desde) }} → {{ fecha(r.hasta) }} · {{ r.dias + 1 }} días }
            </div>
          </div>
          <div class="herramientas">
            <span class="ref"><span class="muestra muestra--plan"></span>Línea base</span>
            <span class="ref"><span class="muestra muestra--ok"></span>Real en fecha</span>
            <span class="ref"><span class="muestra muestra--riesgo"></span>En riesgo</span>
            <span class="ref"><span class="muestra muestra--critico"></span>Desviado</span>
            <button type="button" class="btn-chico" [class.btn-chico--activo]="soloDesviadas()" (click)="soloDesviadas.set(!soloDesviadas())">
              Sólo desviadas
            </button>
          </div>
        </div>
        @if (!rango()) {
          <p class="muted vacio">Cargá las fechas plan de las tareas (solapa Carga de fechas) para ver el cronograma.</p>
        } @else {
          <div class="scroll">
            <table class="tabla-seguimiento gantt">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Tarea</th>
                  <th class="num">% real</th>
                  <th class="num">Desvío</th>
                  <th class="linea-tiempo">
                    @for (m of marcas(); track m.fecha) {
                      <span class="marca" [style.left.%]="m.pos">{{ fechaCorta(m.fecha) }}</span>
                    }
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (f of filas(); track f.tarea.id) {
                  <tr [class.fila-tarea]="!f.subtarea">
                    <td class="muted">{{ f.tarea.numero }}</td>
                    <td class="nombre" [class.sub]="f.subtarea" [title]="f.tarea.nombre">{{ f.tarea.nombre }}</td>
                    <td class="num">{{ f.avance }} %</td>
                    <td class="num" [class]="'num texto-' + (f.semaforo ?? '')">{{ f.desvio != null && f.desvio > 0 ? '+' + f.desvio + ' d' : lineaBase() ? 'A tiempo' : '—' }}</td>
                    <td class="linea-tiempo">
                      @if (posHoy() != null) {
                        <span class="hoy" [style.left.%]="posHoy()"></span>
                      }
                      @if (f.plan) {
                        <span class="barra barra--plan" [style.left.%]="f.plan.izq" [style.width.%]="f.plan.ancho"
                          [title]="'Línea base: ' + fecha(f.tarea.fechaInicio) + ' → ' + fecha(f.tarea.fechaFin)"></span>
                      }
                      @if (f.real) {
                        <span class="barra barra--real" [class]="'barra barra--real barra--' + (f.semaforo ?? 'ok')" [style.left.%]="f.real.izq" [style.width.%]="f.real.ancho"
                          [title]="'Real: ' + fecha(f.inicioReal) + ' → ' + fecha(f.fin) + ' · ' + f.avance + ' %' + (f.semaforo ? ' · ' + semaforoLabel[f.semaforo] : '')">
                          <span class="barra__avance" [style.width.%]="f.avance"></span>
                        </span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      <aside class="panel desvios">
        <h2 class="panel__titulo">Detección de desvíos <span class="badge" [class.badge--critico]="desviadas().length">{{ desviadas().length }} activas</span></h2>
        @if (!lineaBase()) {
          <p class="muted">Los desvíos se miden después de fijar la línea base.</p>
        }
        <ul class="alertas">
          @for (f of desviadas(); track f.tarea.id) {
            <li class="alerta" [class]="'alerta alerta--' + (f.semaforo === 'critico' ? 'critica' : 'advertencia')">
              <span class="alerta__icono" aria-hidden="true">!</span>
              <div>
                <strong>Tarea {{ f.tarea.numero }} · +{{ f.desvio }} días</strong>
                <div class="alerta__detalle">{{ f.tarea.nombre }} — fin estimado {{ fecha(f.fin) }} ({{ f.avance }} %)</div>
              </div>
            </li>
          } @empty {
            @if (lineaBase()) {
              <li class="muted">Ninguna tarea atrasada.</li>
            }
          }
        </ul>
      </aside>
    </div>
  `,
  styles: `
    .gantt-layout { display: grid; grid-template-columns: minmax(0, 1fr) 17rem; gap: 1rem; align-items: start; }
    @media (max-width: 1100px) { .gantt-layout { grid-template-columns: 1fr; } }
    .herramientas { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; font-size: 0.75rem; color: var(--color-text-muted); }
    .ref { display: inline-flex; align-items: center; gap: 0.3rem; }
    .muestra { width: 14px; height: 8px; border-radius: 3px; display: inline-block; }
    .muestra--plan, .barra--plan { background: #b9cde3; }
    .muestra--ok { background: #1f9d55; } .barra--ok { --c: #1f9d55; }
    .muestra--riesgo { background: #c8790f; } .barra--riesgo { --c: #c8790f; }
    .muestra--critico { background: #d6483f; } .barra--critico { --c: #d6483f; }
    .vacio { padding: 1.25rem 1.4rem; }
    .gantt { min-width: 60rem; }
    .fila-tarea { background: #eef3fa; font-weight: 700; }
    .nombre { max-width: 16rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sub { padding-left: 1.6rem; }
    .linea-tiempo { position: relative; width: 55%; min-width: 30rem; height: 38px; padding: 0 !important; }
    th.linea-tiempo { height: 32px; }
    .marca { position: absolute; top: 9px; font-size: 0.68rem; color: var(--color-text-muted); border-left: 1px solid var(--color-border); padding-left: 3px; height: 100%; }
    .hoy { position: absolute; top: 0; bottom: 0; border-left: 2px dashed var(--color-danger); opacity: 0.6; }
    .barra { position: absolute; border-radius: 4px; min-width: 3px; }
    .barra--plan { top: 7px; height: 9px; }
    .barra--real { top: 19px; height: 12px; overflow: hidden; background: color-mix(in srgb, var(--c) 30%, white); }
    .barra__avance { display: block; height: 100%; background: var(--c); }
    .desvios .panel__titulo { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
  `,
})
export class ProyectoGanttComponent {
  readonly tareas = input.required<Tarea[]>();
  readonly lineaBase = input(false);

  protected readonly fecha = fecha;
  protected readonly fechaCorta = fechaCorta;
  protected readonly semaforoLabel = SEMAFORO_LABEL;
  protected readonly soloDesviadas = signal(false);

  private readonly datos = computed(() =>
    aplanarTareas(this.tareas()).map(({ tarea, subtarea }) => {
      const avance = avanceTarea(tarea);
      const desvio = this.lineaBase() ? desvioTarea(tarea, avance) : null;
      return { tarea, subtarea, avance, desvio, semaforo: semaforoDesvio(desvio),
        inicioReal: tarea.fechaInicioReal, fin: finEstimado(tarea, avance) };
    }),
  );

  protected readonly rango = computed(() => {
    const fechas = this.datos().flatMap((d) => [d.tarea.fechaInicio, d.tarea.fechaFin, d.inicioReal, this.lineaBase() ? d.fin : null])
      .filter((f): f is string => !!f).sort();
    if (!fechas.length) return null;
    const desde = fechas[0];
    const hasta = fechas[fechas.length - 1];
    return { desde, hasta, dias: diasEntre(desde, hasta) };
  });

  private pos(f: string): number {
    const r = this.rango()!;
    return (diasEntre(r.desde, f) / (r.dias + 1)) * 100;
  }

  private tramo(desde: string | null, hasta: string | null): { izq: number; ancho: number } | null {
    if (!desde || !hasta || hasta < desde) return null;
    const r = this.rango()!;
    return { izq: this.pos(desde), ancho: ((diasEntre(desde, hasta) + 1) / (r.dias + 1)) * 100 };
  }

  protected readonly filas = computed(() => {
    if (!this.rango()) return [];
    return this.datos()
      .filter((d) => !this.soloDesviadas() || (d.desvio ?? 0) > 0)
      .map((d) => ({ ...d, plan: this.tramo(d.tarea.fechaInicio, d.tarea.fechaFin),
        real: this.lineaBase() ? this.tramo(d.inicioReal, d.fin) : null }));
  });

  // Marcas repartidas en el rango (hasta ~14): diarias en obras cortas, semanales o más en las largas.
  protected readonly marcas = computed(() => {
    const r = this.rango();
    if (!r) return [];
    const paso = r.dias <= 28 ? Math.max(1, Math.ceil(r.dias / 14)) : Math.ceil(r.dias / 12 / 7) * 7;
    const marcas: { fecha: string; pos: number }[] = [];
    for (let d = 0; d <= r.dias; d += paso) {
      const f = sumarDias(r.desde, d);
      marcas.push({ fecha: f, pos: this.pos(f) });
    }
    return marcas;
  });

  protected readonly posHoy = computed(() => {
    const r = this.rango();
    const h = hoy();
    return r && h >= r.desde && h <= r.hasta ? this.pos(h) : null;
  });

  protected readonly desviadas = computed(() =>
    this.datos().filter((d) => d.subtarea || !this.datos().some((x) => x.tarea.padreId === d.tarea.id))
      .filter((d) => (d.desvio ?? 0) > 0)
      .sort((a, b) => (b.desvio ?? 0) - (a.desvio ?? 0)),
  );
}
