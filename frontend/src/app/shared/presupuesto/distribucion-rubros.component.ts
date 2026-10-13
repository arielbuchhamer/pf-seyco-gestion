import { Component, computed, input } from '@angular/core';
import { TotalesRubro } from '../../core/models/presupuesto.model';
import { numero, pesos } from '../../core/utils/formato';

// Barra horizontal "Distribución por rubro" (mano de obra, materiales, equipos, terceros).
@Component({
  selector: 'app-distribucion-rubros',
  standalone: true,
  template: `
    <section class="panel">
      <h2 class="panel__titulo">Distribución por rubro</h2>
      <div class="barra" role="img" [attr.aria-label]="resumen()">
        @for (r of rubros(); track r.etiqueta) {
          <div [style.width.%]="r.porcentaje" [style.background]="r.color" [title]="r.etiqueta"></div>
        }
      </div>
      <div class="leyenda">
        @for (r of rubros(); track r.etiqueta) {
          <div class="leyenda__item">
            <span class="punto" [style.background]="r.color"></span>
            <div>
              <div class="leyenda__etiqueta">{{ r.etiqueta }}</div>
              <div class="leyenda__monto num">
                {{ r.monto }} <span>· {{ r.porcentajeTexto }}</span>
              </div>
            </div>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .barra {
      display: flex;
      height: 14px;
      border-radius: 999px;
      overflow: hidden;
      background: var(--color-border);
    }
    .leyenda {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(12.5rem, 1fr));
      gap: 0.75rem;
      margin-top: 0.9rem;
    }
    .leyenda__item {
      display: flex;
      gap: 0.6rem;
      align-items: flex-start;
    }
    .punto {
      width: 12px;
      height: 12px;
      border-radius: 3px;
      margin-top: 4px;
      flex: none;
    }
    .leyenda__etiqueta {
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }
    .leyenda__monto {
      font-weight: 600;
      text-align: left;
    }
    .leyenda__monto span {
      color: var(--color-text-muted);
      font-weight: 500;
    }
  `,
})
export class DistribucionRubrosComponent {
  readonly totales = input.required<TotalesRubro>();

  protected readonly rubros = computed(() => {
    const t = this.totales();
    const total = t.total || 1;
    return [
      { etiqueta: 'Mano de obra', valor: t.manoObra, color: '#0f5fa6' },
      { etiqueta: 'Materiales', valor: t.materiales, color: '#7fb5e0' },
      { etiqueta: 'Equipos y grúas', valor: t.equipos, color: '#c8790f' },
      { etiqueta: 'Provisión de terceros', valor: t.terceros, color: '#5b6474' },
    ].map((r) => {
      const porcentaje = (r.valor / total) * 100;
      return { ...r, porcentaje, monto: pesos(r.valor), porcentajeTexto: `${numero(Math.round(porcentaje * 10) / 10)} %` };
    });
  });

  protected readonly resumen = computed(() =>
    this.rubros().map((r) => `${r.etiqueta} ${r.porcentajeTexto}`).join(', '),
  );
}
