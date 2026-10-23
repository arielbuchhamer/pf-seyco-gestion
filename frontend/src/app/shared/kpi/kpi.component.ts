import { Component, input } from '@angular/core';

export type IconoKpi = 'cronograma' | 'costo' | 'reloj' | 'avance' | 'billetera' | 'factura' | 'cartera' | 'alerta' | 'margen';
export type TonoKpi = 'ok' | 'riesgo' | 'critico' | 'neutro';

// Tarjeta de indicador (como las del prototipo VoltControl): etiqueta, valor grande, ícono en un
// chip del color del semáforo, una nota y, opcional, una barra de progreso (0-100).
// El tono se acompaña siempre de texto (la nota), nunca sólo color.
@Component({
  selector: 'app-kpi',
  standalone: true,
  template: `
    <div class="kpi-tarjeta" [class]="'kpi-tarjeta kpi-tarjeta--' + tono()">
      <div class="cabeza">
        <span class="etiqueta">{{ etiqueta() }}</span>
        <span class="chip" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            @switch (icono()) {
              @case ('cronograma') { <path d="M3 3v18h18"></path><path d="m7 15 4-4 3 3 5-6"></path> }
              @case ('costo') { <circle cx="12" cy="12" r="9"></circle><path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6.5v11"></path> }
              @case ('reloj') { <circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path> }
              @case ('avance') { <path d="M4 20V10M10 20V4M16 20v-7M21 20H3"></path> }
              @case ('billetera') { <rect x="3" y="6" width="18" height="13" rx="2"></rect><path d="M3 10h18M16 14.5h2"></path> }
              @case ('factura') { <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"></path><path d="M9 8h6M9 12h6"></path> }
              @case ('cartera') { <rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path> }
              @case ('margen') { <path d="m4 17 6-6 4 4 6-8"></path><path d="M15 7h5v5"></path> }
              @case ('alerta') { <path d="M12 3 2 20h20z"></path><path d="M12 10v4M12 17h.01"></path> }
            }
          </svg>
        </span>
      </div>
      <div class="valor">{{ valor() }}@if (secundario()) {<span class="secundario"> {{ secundario() }}</span>}</div>
      @if (progreso() != null) {
        <div class="barra" role="img" [attr.aria-label]="etiqueta() + ': ' + progreso() + ' %'">
          <div class="barra__relleno" [style.width.%]="progreso()! > 100 ? 100 : progreso()"></div>
          @if (marca() != null) {
            <div class="barra__marca" [style.left.%]="marca()! > 100 ? 100 : marca()" [title]="marcaTexto()"></div>
          }
        </div>
      }
      @if (nota()) {
        <div class="nota">{{ nota() }}</div>
      }
    </div>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .kpi-tarjeta { height: 100%; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 14px;
      padding: 0.8rem 0.95rem; display: flex; flex-direction: column; gap: 0.3rem; position: relative; overflow: hidden; }
    .kpi-tarjeta::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 3px; background: var(--tono); }
    .kpi-tarjeta--ok { --tono: var(--color-success); --tono-fondo: #e3f3ea; --tono-texto: var(--color-success-dark); }
    .kpi-tarjeta--riesgo { --tono: var(--color-accent); --tono-fondo: #f8eedd; --tono-texto: #8a4f00; }
    .kpi-tarjeta--critico { --tono: var(--color-danger); --tono-fondo: #fbe6e4; --tono-texto: #b3332b; }
    .kpi-tarjeta--neutro { --tono: var(--color-primary); --tono-fondo: #e6eef8; --tono-texto: var(--color-primary-dark); }
    .cabeza { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
    .etiqueta { font-size: 0.85rem; font-weight: 600; color: var(--color-text-muted); }
    .chip { width: 30px; height: 30px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center;
      background: var(--tono-fondo); color: var(--tono-texto); flex: none; }
    .valor { font-size: 1.45rem; font-weight: 800; color: var(--color-ink); font-variant-numeric: tabular-nums; line-height: 1.1; letter-spacing: -0.01em; }
    .secundario { font-size: 0.85rem; font-weight: 600; color: var(--color-text-muted); }
    .nota { font-size: 0.72rem; color: var(--tono-texto); font-weight: 600; }
    .barra { position: relative; height: 6px; border-radius: 999px; background: var(--color-border); margin-top: 0.15rem; }
    .barra__relleno { height: 100%; border-radius: 999px; background: var(--tono); }
    .barra__marca { position: absolute; top: -3px; width: 2px; height: 12px; background: var(--color-ink); border-radius: 1px; }
  `,
})
export class KpiComponent {
  readonly etiqueta = input.required<string>();
  readonly valor = input.required<string>();
  readonly secundario = input<string | null>(null);
  readonly nota = input<string | null>(null);
  readonly icono = input<IconoKpi>('avance');
  readonly tono = input<TonoKpi>('neutro');
  // Barra opcional (0-100) y una marca de referencia (ej. el avance planificado).
  readonly progreso = input<number | null>(null);
  readonly marca = input<number | null>(null);
  readonly marcaTexto = input('');
}
