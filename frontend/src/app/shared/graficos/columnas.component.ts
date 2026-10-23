import { Component, computed, input } from '@angular/core';

export interface SerieColumnas {
  nombre: string;
  color: string;
}

export interface GrupoColumnas {
  etiqueta: string;
  valores: number[];
}

// Columnas agrupadas verticales, grandes y simples (como los gráficos del prototipo VoltControl):
// un grupo por obra y una columna por serie (ej. avance planificado vs. real). Un solo eje que
// arranca en cero, el valor escrito arriba de cada columna y la leyenda arriba.
@Component({
  selector: 'app-columnas',
  standalone: true,
  template: `
    <div class="leyenda" aria-hidden="true">
      @for (s of series(); track s.nombre) {
        <span><i [style.background]="s.color"></i>{{ s.nombre }}</span>
      }
    </div>
    <div class="grafico" role="table" [attr.aria-label]="titulo()">
      <div class="grilla" aria-hidden="true">
        @for (g of [100, 75, 50, 25, 0]; track g) {
          <div class="grilla__linea"><span>{{ formato()(tope() * g / 100) }}</span></div>
        }
      </div>
      <div class="grupos">
        @for (g of grupos(); track g.etiqueta) {
          <div class="grupo" role="row">
            <div class="columnas">
              @for (v of g.valores; track $index; let i = $index) {
                <div class="columna" role="cell" [title]="series()[i].nombre + ': ' + formato()(v)">
                  <span class="columna__valor" [style.bottom]="'calc(' + alto(v) + '% + 3px)'">{{ formato()(v) }}</span>
                  <div class="columna__barra" [style.height.%]="alto(v)" [style.background]="series()[i].color"></div>
                </div>
              }
            </div>
            <div class="grupo__etiqueta" role="rowheader" [title]="g.etiqueta">{{ g.etiqueta }}</div>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .leyenda { display: flex; gap: 1rem; font-size: 0.78rem; color: var(--color-text-muted); margin-bottom: 0.6rem; }
    .leyenda span { display: inline-flex; align-items: center; gap: 0.35rem; }
    .leyenda i { width: 10px; height: 10px; border-radius: 3px; }
    .grafico { position: relative; height: 210px; padding-left: 3rem; margin-top: 1.1rem; }
    .grilla { position: absolute; inset: 0 0 1.6rem 0; display: flex; flex-direction: column; justify-content: space-between; }
    .grilla__linea { border-top: 1px solid var(--color-border); position: relative; height: 0; }
    .grilla__linea span { position: absolute; left: 0; top: -0.5rem; font-size: 0.68rem; color: var(--color-text-muted); }
    .grupos { position: relative; height: 100%; display: flex; gap: 1rem; }
    .grupo { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .columnas { flex: 1; display: flex; align-items: flex-end; justify-content: center; gap: 4px; }
    .columna { position: relative; flex: 1; max-width: 2.6rem; height: 100%; }
    .columna__barra { position: absolute; bottom: 0; left: 0; right: 0; border-radius: 6px 6px 0 0; min-height: 2px; }
    .columna__valor { position: absolute; left: 50%; transform: translateX(-50%); font-size: 0.68rem; font-weight: 600; color: var(--color-text); white-space: nowrap; }
    .grupo__etiqueta { height: 1.6rem; line-height: 1.6rem; font-size: 0.75rem; text-align: center; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `,
})
export class ColumnasComponent {
  readonly titulo = input('');
  readonly series = input.required<SerieColumnas[]>();
  readonly grupos = input.required<GrupoColumnas[]>();
  readonly formato = input<(v: number) => string>((v) => String(Math.round(v)));
  // Máximo fijo de la escala (ej. 100 para porcentajes); por defecto, el mayor valor.
  readonly maximo = input<number | null>(null);

  // Con escala libre se deja un 15 % de aire arriba para el valor escrito sobre la columna más alta.
  protected readonly tope = computed(() => this.maximo() ?? Math.max(1, ...this.grupos().flatMap((g) => g.valores)) * 1.15);

  alto(valor: number): number {
    return Math.max(0, Math.min(valor / this.tope(), 1)) * 100;
  }
}
