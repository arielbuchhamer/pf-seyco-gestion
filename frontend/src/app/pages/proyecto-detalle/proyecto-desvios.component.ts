import { Component, ElementRef, HostListener, afterNextRender, inject, input, model, output } from '@angular/core';
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

// Panel lateral del Gantt: el detalle completo sin salir de la obra. Dos solapas: las tareas
// desviadas (de a 10; al elegir una, el Gantt va a esa fila) y todos los avisos de la obra (los
// mismos de la pantalla Avisos). Se cierra con la X, con Esc o con un clic en el fondo.
@Component({
  selector: 'app-proyecto-desvios',
  standalone: true,
  imports: [AvisosComponent, PaginadorComponent],
  template: `
    <button type="button" class="fondo" aria-label="Cerrar" (click)="cerrar.emit()"></button>
    <aside class="cajon" role="dialog" aria-modal="true" aria-labelledby="desvios-titulo" tabindex="-1">
      <header class="cajon__cabecera">
        <h2 id="desvios-titulo">Desvíos y avisos de la obra</h2>
        <button type="button" class="cerrar" aria-label="Cerrar" (click)="cerrar.emit()">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </header>

      <div class="solapas" role="tablist">
        <button type="button" role="tab" [attr.aria-selected]="solapa() === 'tareas'" [class.activa]="solapa() === 'tareas'"
          (click)="solapa.set('tareas')">Tareas desviadas <span class="contador">{{ desviadas().length }}</span></button>
        <button type="button" role="tab" [attr.aria-selected]="solapa() === 'avisos'" [class.activa]="solapa() === 'avisos'"
          (click)="solapa.set('avisos')">Avisos de la obra <span class="contador">{{ alertas()?.length ?? '…' }}</span></button>
      </div>

      <div class="cajon__cuerpo">
        @if (solapa() === 'tareas') {
          @if (!lineaBase()) {
            <p class="muted">Los desvíos se miden después de fijar la línea base (solapa Carga de fechas).</p>
          } @else if (!desviadas().length) {
            <p class="muted">Ninguna tarea atrasada: todas vienen en fecha.</p>
          } @else {
            <section class="panel avisos">
              <div class="avisos__cabecera">
                <h3>Tareas desviadas</h3>
                <div class="avisos__conteo">
                  <span class="conteo conteo--critico">{{ desviadas().length }} atrasadas</span>
                </div>
              </div>
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
            </section>
          }
        } @else {
          @if (alertas(); as a) {
            <app-avisos [alertas]="a" [mostrarFecha]="true" vacio="La obra no tiene avisos: viene bien en plazo, costos y cobros." />
          } @else {
            <p class="muted">Cargando avisos…</p>
          }
        }
      </div>
    </aside>
  `,
  styles: `
    .fondo { position: fixed; inset: 0; z-index: 30; border: 0; padding: 0; background: rgba(15, 23, 42, 0.35); cursor: default; }
    .cajon {
      position: fixed; top: 0; right: 0; bottom: 0; z-index: 31;
      display: flex; flex-direction: column;
      width: min(25rem, 100vw);
      background: var(--color-surface);
      border-left: 1px solid var(--color-border);
      box-shadow: var(--shadow-card);
      animation: entrar 0.18s ease-out;
      outline: none;
    }
    .cajon__cabecera { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.1rem 1.25rem 0.75rem; }
    h2 { margin: 0; font-size: 1.1rem; color: var(--color-ink); }
    .cerrar { display: inline-flex; padding: 0.35rem; border: 0; border-radius: var(--radius-sm); background: none; color: var(--color-text-muted); cursor: pointer; }
    .cerrar:hover { background: var(--color-bg); color: var(--color-ink); }
    .solapas { display: flex; gap: 0.25rem; padding: 0 1.25rem; border-bottom: 1px solid var(--color-border); }
    .solapas button {
      font: inherit; font-size: 0.85rem; font-weight: 600;
      display: inline-flex; align-items: center; gap: 0.4rem;
      padding: 0.6rem 0.75rem; margin-bottom: -1px;
      border: 0; border-bottom: 2px solid transparent; background: none;
      color: var(--color-text-muted); cursor: pointer;
    }
    .solapas button.activa { color: var(--color-primary); border-bottom-color: var(--color-primary); }
    .contador { padding: 0 0.45rem; border-radius: 999px; font-size: 0.72rem; background: color-mix(in srgb, var(--color-text-muted) 16%, transparent); color: var(--color-text); }
    .cajon__cuerpo { flex: 1; min-height: 0; overflow-y: auto; padding: 1rem 1.25rem 1.25rem; }
    .ayuda { margin: 0; font-size: 0.8rem; color: var(--color-text-muted); }
    button.aviso { font: inherit; width: 100%; text-align: left; cursor: pointer; color: var(--color-ink); border: 0; border-left: 4px solid var(--aviso-color); }
    button.aviso p { margin: 0.15rem 0 0; font-size: 0.82rem; color: var(--color-text-muted); }
    button.aviso:hover { filter: brightness(0.97); }
    @keyframes entrar { from { transform: translateX(24px); opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .cajon { animation: none; } }
  `,
})
export class ProyectoDesviosComponent {
  readonly desviadas = input.required<TareaDesviada[]>();
  readonly alertas = input<Alerta[] | null>(null);
  readonly lineaBase = input(false);
  readonly solapa = model<SolapaDesvios>('tareas');
  readonly cerrar = output<void>();
  readonly ir = output<number>();

  protected readonly fecha = fecha;
  protected readonly paginas = paginacion(() => this.desviadas());

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef);
    afterNextRender(() => el.nativeElement.querySelector<HTMLElement>('.cajon')?.focus());
  }

  @HostListener('document:keydown.escape')
  protected escape(): void {
    this.cerrar.emit();
  }
}
