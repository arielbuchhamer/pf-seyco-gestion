import { Component, computed, input, signal } from '@angular/core';
import { numero, pesos } from '../../core/utils/formato';

export interface SegmentoTorta {
  etiqueta: string;
  valor: number;
  color: string;
}

// Gráfico de torta (dona) con leyenda: qué porcentaje del total es cada parte (ej. cuánto se
// gastó en materiales, equipos, mano de obra). SVG sin librerías; hover resalta el segmento.
@Component({
  selector: 'app-torta',
  standalone: true,
  template: `
    <div class="torta">
      <svg viewBox="0 0 120 120" [attr.width]="tamano()" [attr.height]="tamano()" role="img" [attr.aria-label]="resumen()">
        @if (total() === 0) {
          <circle cx="60" cy="60" r="46" fill="none" stroke="var(--color-border)" stroke-width="18" />
        }
        @for (s of arcos(); track s.etiqueta; let i = $index) {
          <circle
            cx="60" cy="60" r="46" fill="none"
            [attr.stroke]="s.color"
            [attr.stroke-width]="activo() === i ? 20 : 16"
            [attr.stroke-dasharray]="s.largo + ' ' + circunferencia"
            [attr.stroke-dashoffset]="-s.desde"
            transform="rotate(-90 60 60)"
            (mouseenter)="activo.set(i)" (mouseleave)="activo.set(null)"
          >
            <title>{{ s.etiqueta }}: {{ s.monto }} ({{ s.porcentajeTexto }})</title>
          </circle>
        }
        <text x="60" y="57" text-anchor="middle" class="centro__valor">{{ centro() }}</text>
        <text x="60" y="72" text-anchor="middle" class="centro__etiqueta">{{ activo() != null ? arcos()[activo()!].etiqueta : 'total' }}</text>
      </svg>
      <ul class="leyenda">
        @for (s of arcos(); track s.etiqueta; let i = $index) {
          <li [class.activo]="activo() === i" (mouseenter)="activo.set(i)" (mouseleave)="activo.set(null)">
            <span class="punto" [style.background]="s.color"></span>
            <span class="leyenda__etiqueta">{{ s.etiqueta }}</span>
            <span class="num">{{ s.porcentajeTexto }}</span>
            <span class="num muted">{{ s.monto }}</span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    .torta { display: flex; align-items: center; justify-content: center; gap: 1.5rem; flex-wrap: wrap; }
    svg circle { transition: stroke-width 0.15s; cursor: default; }
    .centro__valor { font-size: 15px; font-weight: 700; fill: var(--color-ink); }
    .centro__etiqueta { font-size: 8px; fill: var(--color-text-muted); }
    .leyenda { list-style: none; margin: 0; padding: 0; flex: 1; min-width: 11rem; display: grid; gap: 0.35rem; }
    .leyenda li { display: grid; grid-template-columns: 12px 1fr auto auto; gap: 0.6rem; align-items: center; font-size: 0.85rem; padding: 0.3rem 0.4rem; border-radius: 8px; }
    .leyenda .num:not(.muted) { font-weight: 700; }
    .leyenda li.activo { background: #eef3fa; }
    .punto { width: 10px; height: 10px; border-radius: 3px; }
    .leyenda .num { text-align: right; }
  `,
})
export class TortaComponent {
  readonly segmentos = input.required<SegmentoTorta[]>();
  // Lado del gráfico en px.
  readonly tamano = input(132);
  // Formato de los montos de la leyenda (por defecto, pesos).
  readonly formato = input<(v: number) => string>(pesos);

  protected readonly circunferencia = 2 * Math.PI * 46;
  protected readonly activo = signal<number | null>(null);

  protected readonly total = computed(() => this.segmentos().reduce((s, x) => s + Math.max(x.valor, 0), 0));

  // Cada segmento deja 1.5 unidades de hueco (separador del color de fondo) si hay más de uno.
  protected readonly arcos = computed(() => {
    const total = this.total();
    const visibles = this.segmentos().filter((s) => s.valor > 0).length;
    const hueco = visibles > 1 ? 1.5 : 0;
    let desde = 0;
    return this.segmentos().map((s) => {
      const fraccion = total ? Math.max(s.valor, 0) / total : 0;
      const largoTotal = fraccion * this.circunferencia;
      const arco = { ...s, desde, largo: Math.max(largoTotal - hueco, 0), monto: this.formato()(s.valor),
        porcentajeTexto: `${numero(Math.round(fraccion * 1000) / 10)} %` };
      desde += largoTotal;
      return arco;
    });
  });

  protected readonly centro = computed(() => {
    const i = this.activo();
    return i != null ? this.arcos()[i].porcentajeTexto : this.formatoCorto(this.total());
  });

  protected readonly resumen = computed(() => this.arcos().map((a) => `${a.etiqueta} ${a.porcentajeTexto}`).join(', '));

  private formatoCorto(valor: number): string {
    return valor >= 1_000_000 ? `$ ${numero(Math.round(valor / 100_000) / 10)} M` : this.formato()(valor);
  }
}
