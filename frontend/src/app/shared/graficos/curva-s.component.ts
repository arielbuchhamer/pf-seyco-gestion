import { Component, computed, input, signal } from '@angular/core';
import { PuntoCurvaS } from '../../core/models/seguimiento.model';
import { fecha, numero } from '../../core/utils/formato';

const ANCHO = 960;
const ALTO = 190;
const M = { izq: 36, der: 12, arr: 10, aba: 24 };

// Curva S: % de avance acumulado planificado (línea base, punteada) vs. real (sólida, hasta hoy).
// Hover: línea vertical y valores del punto más cercano.
@Component({
  selector: 'app-curva-s',
  standalone: true,
  template: `
    <div class="leyenda" aria-hidden="true">
      <span><span class="linea linea--plan"></span>Planificado (línea base)</span>
      <span><span class="linea linea--real"></span>Real</span>
    </div>
    @if (puntos().length < 2) {
      <p class="muted">Faltan fechas plan en las tareas para dibujar la curva.</p>
    } @else {
      <div class="contenedor">
        <svg [attr.viewBox]="'0 0 ' + ancho + ' ' + alto" preserveAspectRatio="none" role="img" aria-label="Curva S de avance planificado y real"
          (mousemove)="mover($event)" (mouseleave)="activo.set(null)">
          @for (y of [0, 25, 50, 75, 100]; track y) {
            <line [attr.x1]="m.izq" [attr.x2]="ancho - m.der" [attr.y1]="py(y)" [attr.y2]="py(y)" class="grilla" />
            <text [attr.x]="m.izq - 6" [attr.y]="py(y) + 3" text-anchor="end" class="eje">{{ y }}%</text>
          }
          @for (t of marcasX(); track t.i) {
            <text [attr.x]="px(t.i)" [attr.y]="alto - 6" text-anchor="middle" class="eje">{{ t.texto }}</text>
          }
          <polygon [attr.points]="areaReal()" class="area" />
          <polyline [attr.points]="lineaPlan()" class="plan" />
          <polyline [attr.points]="lineaReal()" class="real" />
          @if (activo() != null) {
            <line [attr.x1]="px(activo()!)" [attr.x2]="px(activo()!)" [attr.y1]="m.arr" [attr.y2]="alto - m.aba" class="cursor" />
            <circle [attr.cx]="px(activo()!)" [attr.cy]="py(puntos()[activo()!].plan)" r="4" class="punto--plan" />
            @if (puntos()[activo()!].real != null) {
              <circle [attr.cx]="px(activo()!)" [attr.cy]="py(puntos()[activo()!].real!)" r="4" class="punto--real" />
            }
          }
        </svg>
        @if (activo() != null) {
          <div class="tooltip" [style.left.%]="(px(activo()!) / ancho) * 100">
            <strong>{{ fecha(puntos()[activo()!].fecha) }}</strong>
            <div>Plan: {{ numero(puntos()[activo()!].plan) }} %</div>
            <div>Real: {{ puntos()[activo()!].real != null ? numero(puntos()[activo()!].real!) + ' %' : '—' }}</div>
          </div>
        }
      </div>
    }
  `,
  styles: `
    .leyenda { display: flex; gap: 1rem; font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: 0.5rem; }
    .leyenda > span { display: inline-flex; align-items: center; gap: 0.4rem; }
    .linea { width: 18px; border-top: 2px solid #2a9d8f; }
    .linea--plan { border-top-style: dashed; }
    .linea--real { border-color: var(--color-primary); }
    .contenedor { position: relative; }
    svg { width: 100%; height: 190px; display: block; }
    .grilla { stroke: var(--color-border); stroke-width: 1; }
    .eje { font-size: 10px; fill: var(--color-text-muted); }
    .plan, .real { fill: none; stroke-width: 2; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
    .plan { stroke: #2a9d8f; stroke-dasharray: 5 4; }
    .real { stroke: var(--color-primary); stroke-width: 3; }
    .area { fill: color-mix(in srgb, var(--color-primary) 12%, transparent); stroke: none; }
    .cursor { stroke: var(--color-text-muted); stroke-width: 1; vector-effect: non-scaling-stroke; }
    .punto--plan, .punto--real { stroke: #fff; stroke-width: 2; }
    .punto--plan { fill: #2a9d8f; }
    .punto--real { fill: var(--color-primary); }
    .tooltip { position: absolute; top: 0; transform: translateX(-50%); background: var(--color-ink); color: #fff;
      font-size: 0.72rem; padding: 0.35rem 0.55rem; border-radius: 6px; pointer-events: none; white-space: nowrap; }
  `,
})
export class CurvaSComponent {
  readonly puntos = input.required<PuntoCurvaS[]>();

  protected readonly ancho = ANCHO;
  protected readonly alto = ALTO;
  protected readonly m = M;
  protected readonly fecha = fecha;
  protected readonly numero = numero;
  protected readonly activo = signal<number | null>(null);

  px(i: number): number {
    const n = Math.max(this.puntos().length - 1, 1);
    return M.izq + (i / n) * (ANCHO - M.izq - M.der);
  }

  py(valor: number): number {
    return M.arr + (1 - valor / 100) * (ALTO - M.arr - M.aba);
  }

  protected readonly lineaPlan = computed(() => this.puntos().map((p, i) => `${this.px(i)},${this.py(p.plan)}`).join(' '));
  protected readonly lineaReal = computed(() =>
    this.puntos()
      .map((p, i) => (p.real == null ? null : `${this.px(i)},${this.py(p.real)}`))
      .filter((p) => p != null)
      .join(' '),
  );

  // Área bajo la línea real (hasta el último punto con dato).
  protected readonly areaReal = computed(() => {
    const pts = this.puntos().map((p, i) => ({ i, real: p.real })).filter((p) => p.real != null);
    if (pts.length < 2) return '';
    const base = this.py(0);
    return [`${this.px(pts[0].i)},${base}`, ...pts.map((p) => `${this.px(p.i)},${this.py(p.real!)}`), `${this.px(pts[pts.length - 1].i)},${base}`].join(' ');
  });

  // Hasta 6 fechas en el eje X, repartidas.
  protected readonly marcasX = computed(() => {
    const n = this.puntos().length;
    const paso = Math.max(1, Math.ceil(n / 6));
    return this.puntos()
      .map((p, i) => ({ i, texto: fecha(p.fecha).slice(0, 5) }))
      .filter((t) => t.i % paso === 0 || t.i === n - 1);
  });

  mover(evento: MouseEvent): void {
    const svg = evento.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const x = ((evento.clientX - rect.left) / rect.width) * ANCHO;
    const n = this.puntos().length - 1;
    const i = Math.round(((x - M.izq) / (ANCHO - M.izq - M.der)) * n);
    this.activo.set(Math.max(0, Math.min(n, i)));
  }
}
