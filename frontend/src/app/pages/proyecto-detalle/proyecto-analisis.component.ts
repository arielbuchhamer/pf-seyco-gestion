import { Component, computed, input } from '@angular/core';
import { ComparacionRubro, Indicadores, RUBRO_COLOR, RUBRO_LABEL } from '../../core/models/seguimiento.model';
import { dolares, fecha, numero, pesos, pesosCorto } from '../../core/utils/formato';
import { PaginadorComponent, paginacion } from '../../shared/paginador/paginador.component';

// Debajo del tablero de la solapa Indicadores:
//  · Cotizado vs. real por renglón: los gastos cargados con su renglón del presupuesto contra lo
//    cotizado en ese renglón (el ejemplo del cliente: grúa cotizada $30 M, van $40 M).
//  · La obra en dólares: lo cotizado al dólar del día del presupuesto y cada gasto al dólar de su
//    fecha, para que un "excedido" no sea sólo inflación (cotización de argentinadatos.com).
@Component({
  selector: 'app-proyecto-analisis',
  standalone: true,
  imports: [PaginadorComponent],
  template: `
    @let i = indicadores();
    <div class="tablero__fila tablero__fila--mitades analisis">
      <section class="panel tablero__panel">
        <div class="tablero__cabecera">
          <div><h3>Cotizado vs. real por renglón</h3><span class="muted chico">Gastos cargados indicando su renglón del presupuesto</span></div>
        </div>
        @if (i.renglones.length) {
          <div class="tabla-scroll">
            <table class="tabla-seguimiento">
              <thead><tr><th>Renglón</th><th>Rubro</th><th class="num">Cotizado</th><th class="num">Real</th><th class="num">Uso</th></tr></thead>
              <tbody>
                @for (r of renglones.pagina().items; track r.itemId + r.rubro) {
                  <tr>
                    <td><span class="muted">{{ r.numero }}</span> {{ r.descripcion }}</td>
                    <td><span class="punto" [style.background]="rubroColor[r.rubro]"></span>{{ rubroLabel[r.rubro] }}</td>
                    <td class="num">{{ pesosCorto(r.cotizado) }}</td>
                    <td class="num">{{ pesosCorto(r.real) }}</td>
                    <td class="num"><strong [class]="clase(r.porcentajeConsumido, r.cotizado)">{{ uso(r.porcentajeConsumido, r.cotizado) }}</strong></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-paginador [pagina]="renglones.pagina()" (cambiar)="renglones.actual.set($event)" />
        } @else {
          <p class="vacio-grafico">Todavía no hay gastos asignados a un renglón. Al cargar un gasto (solapa Costos reales) elegí su renglón del presupuesto, por ejemplo "Hora de grúa".</p>
        }
      </section>

      <section class="panel tablero__panel">
        <div class="tablero__cabecera">
          <div><h3>La obra en dólares</h3><span class="muted chico">Sin el efecto de la inflación</span></div>
        </div>
        @if (i.enDolares; as d) {
          @if (d.disponible) {
            <div class="usd">
              <div><span class="muted chico">Presupuesto</span><strong>{{ dolares(d.presupuestoUsd) }}</strong>
                <small class="muted">dólar {{ d.casa }} {{ pesos(d.dolarPresupuesto) }} al {{ fecha(d.fechaPresupuesto) }}</small></div>
              <div><span class="muted chico">Gastado</span><strong [class.texto-critico]="(d.costoRealUsd ?? 0) > (d.presupuestoUsd ?? 0)">{{ dolares(d.costoRealUsd) }}</strong>
                <small class="muted">cada gasto al dólar de su fecha</small></div>
              <div><span class="muted chico">Presupuesto a valores de hoy</span><strong>{{ pesosCorto(d.presupuestoActualizado) }}</strong>
                <small class="muted">dólar hoy {{ pesos(d.dolarHoy) }} · cotizado {{ pesosCorto(i.presupuesto) }}</small></div>
            </div>
            <ul class="consumo">
              @for (r of rubrosUsd(); track r.rubro) {
                <li>
                  <div class="consumo__fila">
                    <span><i [style.background]="rubroColor[r.rubro]"></i>{{ rubroLabel[r.rubro] }}</span>
                    <span class="consumo__monto">{{ dolares(r.real) }} de {{ dolares(r.presupuestado) }} ·
                      <strong [class]="clase(r.porcentajeConsumido, r.presupuestado)">{{ uso(r.porcentajeConsumido, r.presupuestado) }}</strong></span>
                  </div>
                  <div class="consumo__barra"><div [style.width.%]="r.porcentajeConsumido > 100 ? 100 : r.porcentajeConsumido"
                    [style.background]="r.porcentajeConsumido > 100 ? 'var(--color-danger)' : rubroColor[r.rubro]"></div></div>
                </li>
              }
            </ul>
          } @else {
            <p class="vacio-grafico">{{ d.motivo }}</p>
          }
        }
      </section>
    </div>
  `,
  styles: `
    .analisis { margin-top: 1rem; }
    .punto { width: 9px; height: 9px; border-radius: 3px; display: inline-block; margin-right: 0.4rem; }

    .usd { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1rem; }
    .usd div { display: flex; flex-direction: column; gap: 0.15rem; }
    .usd strong { font-size: 1.15rem; color: var(--color-ink); }
    .usd small { font-size: 0.72rem; }
    .consumo { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.7rem; }
    .consumo__fila { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 0.82rem; }
    .consumo__fila i { display: inline-block; width: 9px; height: 9px; border-radius: 3px; margin-right: 0.4rem; }
    .consumo__monto { color: var(--color-text-muted); white-space: nowrap; }
    .consumo__barra { height: 6px; margin-top: 0.3rem; background: var(--color-border); border-radius: 999px; overflow: hidden; }
    .consumo__barra div { height: 100%; border-radius: 999px; }
    .vacio-grafico { color: var(--color-text-muted); font-size: 0.85rem; margin: 0.5rem 0; }
    @media (max-width: 640px) { .usd { grid-template-columns: 1fr; } }
  `,
})
export class ProyectoAnalisisComponent {
  readonly indicadores = input.required<Indicadores>();

  protected readonly rubroLabel = RUBRO_LABEL;
  protected readonly rubroColor = RUBRO_COLOR;
  protected readonly pesos = pesos;
  protected readonly pesosCorto = pesosCorto;
  protected readonly dolares = dolares;
  protected readonly fecha = fecha;

  protected readonly renglones = paginacion(() => this.indicadores().renglones);

  protected readonly rubrosUsd = computed<ComparacionRubro[]>(() =>
    (this.indicadores().enDolares?.rubros ?? []).filter((r) => r.presupuestado > 0 || r.real > 0),
  );

  protected uso(porcentaje: number, cotizado: number): string {
    return cotizado > 0 ? `${numero(Math.round(porcentaje))} %` : 'sin cotizar';
  }

  protected clase(porcentaje: number, cotizado: number): string {
    if (cotizado === 0 || porcentaje > 100) return 'texto-critico';
    return porcentaje > 85 ? 'texto-riesgo' : 'texto-ok';
  }
}
