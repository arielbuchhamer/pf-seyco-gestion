import { httpResource } from '@angular/common/http';
import { Component, ElementRef, computed, inject, input, signal } from '@angular/core';
import { Indicadores } from '../../core/models/seguimiento.model';
import { Tarea } from '../../core/models/tarea.model';
import { diasEntre, fecha, fechaCorta, hoy, sumarDias } from '../../core/utils/formato';
import { SEMAFORO_LABEL, aplanarTareas, avanceTarea, desvioTarea, finEstimado, semaforoDesvio } from '../../core/utils/seguimiento';
import { ProyectoDesviosComponent, SolapaDesvios } from './proyecto-desvios.component';

// Solapa "Gantt", a todo el ancho: por cada tarea, la barra de la línea base (plan) y debajo la
// real (inicio real → fin estimado/real), coloreada según el desvío y rellena según el % de avance.
// Arriba, una franja con el resumen de desvíos (las peores como chips: llevan a su fila) y el botón
// que abre el panel lateral con todas las tareas desviadas y los avisos de la obra. El cronograma
// ocupa el alto de la ventana y scrollea adentro, con las fechas y las tareas siempre visibles; los
// capítulos se pliegan. Se dibuja con posiciones en % sobre el rango total de fechas.
@Component({
  selector: 'app-proyecto-gantt',
  standalone: true,
  imports: [ProyectoDesviosComponent],
  template: `
    @if (!lineaBase()) {
      <div class="franja franja--info">
        <span class="franja__icono" aria-hidden="true">i</span>
        <span>Los desvíos se miden después de fijar la línea base (solapa Carga de fechas).</span>
        <button type="button" class="franja__boton" (click)="abrir('avisos')">Avisos de la obra</button>
      </div>
    } @else if (!desviadas().length) {
      <div class="franja franja--ok">
        <span class="franja__icono" aria-hidden="true">✓</span>
        <span><strong>Todas las tareas en fecha.</strong> Ninguna se pasó de su fin planificado.</span>
        <button type="button" class="franja__boton" (click)="abrir('avisos')">
          Avisos de la obra{{ alertas() ? ' (' + alertas()!.length + ')' : '' }}
        </button>
      </div>
    } @else {
      <div class="franja" [class.franja--critico]="hayCriticas()" [class.franja--riesgo]="!hayCriticas()">
        <span class="franja__icono" aria-hidden="true">!</span>
        <span class="franja__texto">
          <strong>{{ desviadas().length }} {{ desviadas().length === 1 ? 'tarea desviada' : 'tareas desviadas' }}</strong>
          · la peor: {{ desviadas()[0].tarea.numero }} +{{ desviadas()[0].desvio }} d
        </span>
        <span class="chips">
          @for (f of desviadas().slice(0, 3); track f.tarea.id) {
            <button type="button" class="chip" [class]="'chip chip--' + f.semaforo" [title]="f.tarea.nombre" (click)="irA(f.tarea.id)">
              {{ f.tarea.numero }} · +{{ f.desvio }} d
            </button>
          }
        </span>
        <button type="button" class="franja__boton" (click)="abrir('tareas')">
          Ver detalle{{ alertas() ? ' · ' + alertas()!.length + ' avisos' : '' }} ▸
        </button>
      </div>
    }

    <section class="panel panel--tabla cronograma">
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
          <button type="button" class="btn-chico" (click)="plegarTodo()">{{ todoPlegado() ? 'Desplegar todo' : 'Plegar todo' }}</button>
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
                <th class="fijo fijo--num">N°</th>
                <th class="fijo fijo--nombre">Tarea</th>
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
                <tr [class.fila-tarea]="!f.subtarea" [class.fila--resaltada]="resaltada() === f.tarea.id" [attr.data-tarea]="f.tarea.id">
                  <td class="fijo fijo--num muted">{{ f.tarea.numero }}</td>
                  <td class="fijo fijo--nombre" [class.sub]="f.subtarea" [title]="f.tarea.nombre">
                    @if (f.tieneSubtareas) {
                      <button type="button" class="plegar" [attr.aria-expanded]="!plegados().has(f.tarea.id)"
                        [attr.aria-label]="(plegados().has(f.tarea.id) ? 'Desplegar ' : 'Plegar ') + f.tarea.nombre" (click)="alternarPlegado(f.tarea.id)">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true" [class.girado]="plegados().has(f.tarea.id)">
                          <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                      </button>
                    }
                    <span class="nombre">{{ f.tarea.nombre }}</span>
                  </td>
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

    @if (panel(); as solapa) {
      <app-proyecto-desvios [desviadas]="desviadas()" [alertas]="alertas()" [lineaBase]="lineaBase()" [solapa]="solapa"
        (cerrar)="panel.set(null)" (ir)="panel.set(null); irA($event)" />
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 0.75rem; }
    /* Franja de resumen de desvíos. */
    .franja {
      --c: var(--color-primary);
      display: flex; align-items: center; flex-wrap: wrap; gap: 0.6rem 0.9rem;
      padding: 0.65rem 0.9rem; border-radius: 12px; font-size: 0.86rem; color: var(--color-ink);
      background: color-mix(in srgb, var(--c) 9%, var(--color-surface));
      border: 1px solid color-mix(in srgb, var(--c) 35%, var(--color-surface));
    }
    .franja--ok { --c: var(--color-success); }
    .franja--riesgo { --c: var(--color-accent); }
    .franja--critico { --c: var(--color-danger); }
    .franja__icono { display: inline-flex; align-items: center; justify-content: center; width: 1.6rem; height: 1.6rem; flex: none;
      border-radius: 50%; background: var(--c); color: #fff; font-weight: 800; font-size: 0.85rem; }
    .franja__texto { color: var(--color-text); }
    .chips { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .chip { font: inherit; font-size: 0.76rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px; cursor: pointer;
      border: 1px solid transparent; }
    .chip--critico { background: color-mix(in srgb, var(--color-danger) 16%, var(--color-surface)); color: var(--color-danger-texto); }
    .chip--riesgo { background: color-mix(in srgb, var(--color-accent) 18%, var(--color-surface)); color: var(--color-accent-texto); }
    .chip:hover { border-color: currentColor; }
    .franja__boton { font: inherit; font-size: 0.82rem; font-weight: 700; margin-left: auto; padding: 0.4rem 0.8rem; cursor: pointer;
      border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-primary); }
    .franja__boton:hover { border-color: var(--color-primary); }
    /* Cronograma: alto de la ventana y scroll adentro, con encabezado y columnas de tarea fijos. */
    .cronograma { display: flex; flex-direction: column; height: calc(100dvh - 18.5rem); min-height: 24rem; }
    .scroll { flex: 1; min-height: 0; overflow: auto; }
    .herramientas { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; font-size: 0.75rem; color: var(--color-text-muted); }
    .ref { display: inline-flex; align-items: center; gap: 0.3rem; }
    .muestra { width: 14px; height: 8px; border-radius: 3px; display: inline-block; }
    .muestra--plan, .barra--plan { background: #b9cde3; }
    .muestra--ok { background: #1f9d55; } .barra--ok { --c: #1f9d55; }
    .muestra--riesgo { background: #c8790f; } .barra--riesgo { --c: #c8790f; }
    .muestra--critico { background: #d6483f; } .barra--critico { --c: #d6483f; }
    .vacio { padding: 1.25rem 1.4rem; }
    .gantt { min-width: 46rem; }
    thead th { position: sticky; top: 0; z-index: 2; background: var(--color-surface); }
    .fijo { position: sticky; z-index: 1; background: var(--color-surface); }
    thead .fijo { z-index: 3; }
    .fijo--num { left: 0; width: 3.2rem; min-width: 3.2rem; }
    .fijo--nombre { left: 3.2rem; width: 17rem; max-width: 17rem; white-space: nowrap; box-shadow: 1px 0 0 var(--color-border); }
    .fila-tarea, .fila-tarea .fijo { background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface)); font-weight: 700; }
    .fila--resaltada, .fila--resaltada .fijo { background: color-mix(in srgb, var(--color-accent) 22%, var(--color-surface)); transition: background 0.3s; }
    .nombre { display: inline-block; max-width: 14.5rem; overflow: hidden; text-overflow: ellipsis; vertical-align: middle; }
    .sub { padding-left: 1.9rem !important; }
    .plegar { display: inline-flex; vertical-align: middle; margin-right: 0.3rem; padding: 0.15rem; border: 0; border-radius: 4px; background: none; color: var(--color-text-muted); cursor: pointer; }
    .plegar:hover { background: var(--color-bg); color: var(--color-ink); }
    .plegar svg { transition: transform 0.15s ease; }
    .plegar svg.girado { transform: rotate(-90deg); }
    .linea-tiempo { position: relative; width: 100%; min-width: 22rem; height: 38px; padding: 0 !important; }
    th.linea-tiempo { height: 32px; }
    .marca { position: absolute; top: 9px; font-size: 0.68rem; color: var(--color-text-muted); border-left: 1px solid var(--color-border); padding-left: 3px; height: 100%; }
    .hoy { position: absolute; top: 0; bottom: 0; border-left: 2px dashed var(--color-danger); opacity: 0.6; }
    .barra { position: absolute; border-radius: 4px; min-width: 3px; }
    .barra--plan { top: 7px; height: 9px; }
    .barra--real { top: 19px; height: 12px; overflow: hidden; background: color-mix(in srgb, var(--c) 30%, var(--color-surface)); }
    .barra__avance { display: block; height: 100%; background: var(--c); }
    @media (max-width: 900px), (max-height: 640px) { .cronograma { height: auto; } }
  `,
})
export class ProyectoGanttComponent {
  readonly tareas = input.required<Tarea[]>();
  readonly lineaBase = input(false);
  readonly proyectoId = input.required<number>();

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly fecha = fecha;
  protected readonly fechaCorta = fechaCorta;
  protected readonly semaforoLabel = SEMAFORO_LABEL;
  protected readonly soloDesviadas = signal(false);
  protected readonly plegados = signal<ReadonlySet<number>>(new Set());
  protected readonly resaltada = signal<number | null>(null);
  protected readonly panel = signal<SolapaDesvios | null>(null);

  // Avisos de la obra (los mismos de la pantalla Avisos), para la franja y el panel lateral.
  private readonly indicadores = httpResource<Indicadores>(() => `/api/proyectos/${this.proyectoId()}/indicadores`);
  protected readonly alertas = computed(() => this.indicadores.value()?.alertas ?? null);

  private readonly datos = computed(() =>
    aplanarTareas(this.tareas()).map(({ tarea, subtarea, tieneSubtareas }) => {
      const avance = avanceTarea(tarea);
      const desvio = this.lineaBase() ? desvioTarea(tarea, avance) : null;
      return { tarea, subtarea, tieneSubtareas, avance, desvio, semaforo: semaforoDesvio(desvio),
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
    const plegados = this.plegados();
    return this.datos()
      .filter((d) => !this.soloDesviadas() || (d.desvio ?? 0) > 0)
      .filter((d) => !d.subtarea || d.tarea.padreId == null || !plegados.has(d.tarea.padreId))
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

  // Tareas desviadas (las que tienen fechas propias: subtareas y tareas sin subtareas), peores primero.
  protected readonly desviadas = computed(() =>
    this.datos().filter((d) => !d.tieneSubtareas)
      .filter((d) => (d.desvio ?? 0) > 0)
      .sort((a, b) => (b.desvio ?? 0) - (a.desvio ?? 0)),
  );
  protected readonly hayCriticas = computed(() => this.desviadas().some((d) => d.semaforo === 'critico'));

  private readonly padres = computed(() => this.datos().filter((d) => d.tieneSubtareas).map((d) => d.tarea.id));
  protected readonly todoPlegado = computed(() => this.padres().length > 0 && this.padres().every((id) => this.plegados().has(id)));

  protected alternarPlegado(id: number): void {
    this.plegados.update((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      return n;
    });
  }

  protected plegarTodo(): void {
    this.plegados.set(this.todoPlegado() ? new Set() : new Set(this.padres()));
  }

  protected abrir(solapa: SolapaDesvios): void {
    this.panel.set(solapa);
  }

  // Lleva el cronograma a la fila de la tarea (desplegando su capítulo) y la resalta un momento.
  protected irA(id: number): void {
    const tarea = this.tareas().find((t) => t.id === id);
    if (tarea?.padreId != null && this.plegados().has(tarea.padreId)) this.alternarPlegado(tarea.padreId);
    this.soloDesviadas.set(false);
    this.resaltada.set(id);
    setTimeout(() => {
      this.elemento.nativeElement.querySelector(`[data-tarea="${id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    setTimeout(() => {
      if (this.resaltada() === id) this.resaltada.set(null);
    }, 2500);
  }
}
