import { Component, computed, input } from '@angular/core';
import { Indicadores, RUBRO_COLOR, RUBRO_LABEL } from '../../core/models/seguimiento.model';
import { fechaCorta, numero, pesosCorto } from '../../core/utils/formato';
import { semaforoDesvio } from '../../core/utils/seguimiento';
import { AvisosComponent } from '../alertas/avisos.component';
import { CurvaSComponent } from '../graficos/curva-s.component';
import { TortaComponent } from '../graficos/torta.component';
import { KpiComponent, TonoKpi } from '../kpi/kpi.component';

// Tablero de UN proyecto, pensado para alguien que no es experto (estilo del prototipo VoltControl,
// en claro): una frase que resume cómo va la obra, cuatro preguntas (¿va a tiempo?, ¿cuánto se
// avanzó?, ¿cuánto se gastó?, ¿cuánto falta cobrar?), en qué se gastó y gastado vs. previsto por
// rubro, y abajo la curva S con los avisos. Lo usan la solapa Indicadores y el Portafolio con un proyecto.
@Component({
  selector: 'app-tablero-proyecto',
  standalone: true,
  imports: [KpiComponent, TortaComponent, CurvaSComponent, AvisosComponent],
  template: `
    @let i = indicadores();
    <div class="tablero">
      <div class="resumen-obra" [class]="'resumen-obra resumen-obra--' + tonoGeneral()">
        <span class="resumen-obra__icono" aria-hidden="true">{{ tonoGeneral() === 'ok' ? '✓' : '!' }}</span>
        <p>{{ resumen() }}</p>
      </div>

      <div class="tablero__kpis tablero__kpis--4">
        <app-kpi etiqueta="¿Va a tiempo?" icono="reloj" [tono]="tonoPlazo()" [valor]="valorPlazo()" [nota]="notaPlazo()" />
        <app-kpi etiqueta="¿Cuánto se avanzó?" icono="avance" [tono]="tonoAvance()" [valor]="redondo(i.avanceReal) + ' %'"
          [progreso]="i.avanceReal" [marca]="i.lineaBaseFijada ? i.avancePlan : null" marcaTexto="Lo que debería ir a esta fecha"
          [nota]="i.lineaBaseFijada ? 'A esta fecha debería ir ' + redondo(i.avancePlan) + ' %' : 'Todavía no hay un plan fijado'" />
        <app-kpi etiqueta="¿Cuánto se gastó?" icono="billetera" [tono]="tonoGasto()" [valor]="pesosCorto(i.costoReal)"
          [secundario]="'de ' + pesosCorto(i.presupuesto)" [progreso]="porcentajeGastado()" [nota]="notaGasto()" />
        <app-kpi etiqueta="¿Cuánto falta cobrar?" icono="factura" [valor]="pesosCorto(i.certificacion.saldoPorCobrar)"
          [progreso]="i.certificacion.porcentajeCobrado"
          [nota]="'Cobrado ' + pesosCorto(i.certificacion.cobrado) + ' (' + redondo(i.certificacion.porcentajeCobrado) + ' %)' + (i.certificacion.pendienteCobro > 0 ? ' · facturado sin cobrar ' + pesosCorto(i.certificacion.pendienteCobro) : '')" />
      </div>

      <div class="tablero__fila tablero__fila--mitades">
        <section class="panel tablero__panel">
          <div class="tablero__cabecera">
            <div><h3>¿En qué se gastó?</h3><span class="muted chico">Gastos reales cargados, por rubro</span></div>
          </div>
          @if (i.costoReal === 0) {
            <p class="vacio-grafico">Todavía no se cargaron gastos (solapa Costos reales).</p>
          } @else {
            <app-torta [segmentos]="torta()" [tamano]="168" />
          }
        </section>

        <section class="panel tablero__panel">
          <div class="tablero__cabecera">
            <div><h3>Gastado vs. previsto</h3><span class="muted chico">Cuánto de lo presupuestado ya se usó en cada rubro</span></div>
          </div>
          <ul class="consumo">
            @for (r of rubros(); track r.etiqueta) {
              <li>
                <div class="consumo__fila">
                  <span><i [style.background]="r.color"></i>{{ r.etiqueta }}</span>
                  <span class="consumo__monto">{{ r.detalle }} · <strong [class]="r.clase">{{ r.texto }}</strong></span>
                </div>
                <div class="consumo__barra" [title]="r.detalle">
                  <div [style.width.%]="r.ancho" [class]="'consumo__relleno ' + r.clase"></div>
                </div>
              </li>
            }
          </ul>
        </section>
      </div>

      <div class="tablero__fila tablero__fila--2">
        <section class="panel tablero__panel">
          <div class="tablero__cabecera">
            <div>
              <h3>Curva S · avance planificado vs. real</h3>
              <span class="muted chico">Cómo se fue avanzando la obra comparado con lo que se había planeado</span>
            </div>
            @if (i.lineaBaseFijada) {
              <span class="badge" [class]="'badge badge--' + tonoAvance()">{{ brecha() }}</span>
            }
          </div>
          <app-curva-s [puntos]="i.curvaS" />
        </section>
        <app-avisos [alertas]="i.alertas" [desvios]="i.desvios" />
      </div>
    </div>
  `,
})
export class TableroProyectoComponent {
  readonly indicadores = input.required<Indicadores>();

  protected readonly pesosCorto = pesosCorto;

  redondo(valor: number): string {
    return numero(Math.round(valor));
  }

  protected readonly tonoPlazo = computed<TonoKpi>(() => {
    const i = this.indicadores();
    return i.lineaBaseFijada ? (semaforoDesvio(i.plazo.desvioDias) ?? 'neutro') : 'neutro';
  });

  protected readonly valorPlazo = computed(() => {
    const i = this.indicadores();
    const d = i.plazo.desvioDias;
    if (!i.lineaBaseFijada || d == null) return 'Sin plan';
    if (d === 0) return 'Sí, a tiempo';
    return d > 0 ? `Atrasada ${d} ${d === 1 ? 'día' : 'días'}` : `Adelantada ${-d} ${d === -1 ? 'día' : 'días'}`;
  });

  protected readonly notaPlazo = computed(() => {
    const p = this.indicadores().plazo;
    if (!this.indicadores().lineaBaseFijada) return 'Cargá las fechas y fijá la línea base';
    return `Termina el ${fechaCorta(p.finEstimado)} · estaba previsto el ${fechaCorta(p.finPlan)}`;
  });

  protected readonly tonoAvance = computed<TonoKpi>(() => {
    const i = this.indicadores();
    if (!i.lineaBaseFijada) return 'neutro';
    const atraso = i.avancePlan - i.avanceReal;
    return atraso <= 2 ? 'ok' : atraso <= 10 ? 'riesgo' : 'critico';
  });

  protected readonly brecha = computed(() => {
    const i = this.indicadores();
    const d = Math.round(i.avanceReal - i.avancePlan);
    return d >= 0 ? (d === 0 ? 'En línea con el plan' : `${d} % adelantada`) : `${-d} % atrasada`;
  });

  protected readonly porcentajeGastado = computed(() => {
    const i = this.indicadores();
    return i.presupuesto ? (i.costoReal / i.presupuesto) * 100 : 0;
  });

  protected readonly tonoGasto = computed<TonoKpi>(() => {
    const i = this.indicadores();
    if (!i.costoReal) return 'neutro';
    return i.costoProyectado != null && i.costoProyectado > i.presupuesto ? 'critico' : 'ok';
  });

  // "Si sigue así": lo gastado llevado al 100 % del avance.
  protected readonly notaGasto = computed(() => {
    const i = this.indicadores();
    if (!i.costoReal) return 'Todavía no se cargaron gastos';
    if (i.costoProyectado == null) return `${this.redondo(this.porcentajeGastado())} % del presupuesto`;
    return i.costoProyectado > i.presupuesto
      ? `Si sigue así, costaría ${pesosCorto(i.costoProyectado)}: más de lo presupuestado`
      : `Si sigue así, terminaría costando ${pesosCorto(i.costoProyectado)}`;
  });

  // La frase de arriba: lo más importante, en una línea.
  protected readonly tonoGeneral = computed<TonoKpi>(() => {
    const a = this.indicadores().alertas;
    return a.some((x) => x.nivel === 'CRITICA') ? 'critico' : a.some((x) => x.nivel === 'ADVERTENCIA') ? 'riesgo' : 'ok';
  });

  protected readonly resumen = computed(() => {
    const i = this.indicadores();
    const partes: string[] = [];
    const d = i.plazo.desvioDias;
    if (!i.lineaBaseFijada) partes.push('La obra todavía no tiene un plan de fechas fijado');
    else if (d != null && d > 0) partes.push(`La obra va atrasada ${d} ${d === 1 ? 'día' : 'días'}`);
    else if (d != null && d < 0) partes.push(`La obra va adelantada ${-d} ${d === -1 ? 'día' : 'días'}`);
    else partes.push('La obra va a tiempo');
    const excedidos = i.rubros.filter((r) => r.presupuestado > 0 && r.real > r.presupuestado).map((r) => RUBRO_LABEL[r.rubro].toLowerCase());
    if (excedidos.length) partes.push(`ya se gastó más de lo previsto en ${excedidos.join(' y ')}`);
    else if (i.costoReal) partes.push('los gastos están dentro de lo previsto');
    const texto = partes.join(' y ') + '.';
    const cobro = i.certificacion.saldoPorCobrar > 0 ? ` Falta cobrar ${pesosCorto(i.certificacion.saldoPorCobrar)}.` : ' Ya se cobró todo.';
    return texto.charAt(0).toUpperCase() + texto.slice(1) + cobro;
  });

  protected readonly torta = computed(() =>
    this.indicadores().rubros.map((r) => ({ etiqueta: RUBRO_LABEL[r.rubro], valor: r.real, color: RUBRO_COLOR[r.rubro] })),
  );

  // Cada rubro: cuánto de lo previsto ya se usó. La barra llega al 100 % y se pinta roja si se pasó.
  protected readonly rubros = computed(() =>
    this.indicadores()
      .rubros.filter((r) => r.presupuestado > 0 || r.real > 0)
      .map((r) => {
        const pct = r.presupuestado ? (r.real / r.presupuestado) * 100 : 100;
        const excedido = r.real > r.presupuestado;
        return {
          etiqueta: RUBRO_LABEL[r.rubro],
          color: RUBRO_COLOR[r.rubro],
          ancho: Math.min(pct, 100),
          clase: excedido ? 'texto-critico' : pct >= 90 ? 'texto-riesgo' : 'texto-ok',
          texto: !r.presupuestado ? 'No estaba previsto' : excedido ? `Se pasó ${this.redondo(pct - 100)} %` : `${this.redondo(pct)} % usado`,
          detalle: `${pesosCorto(r.real)} de ${pesosCorto(r.presupuestado)}`,
        };
      }),
  );
}
