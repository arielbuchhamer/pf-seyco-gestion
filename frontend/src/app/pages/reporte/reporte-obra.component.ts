import { httpResource } from '@angular/common/http';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ESTADO_PROYECTO_LABEL, Proyecto, TIPO_CLIENTE_LABEL, TIPO_OBRA_LABEL } from '../../core/models/proyecto.model';
import {
  Certificacion,
  Indicadores,
  RUBRO_LABEL,
  TIPO_CERTIFICACION_LABEL,
} from '../../core/models/seguimiento.model';
import { fecha, hoy, numero, pesos } from '../../core/utils/formato';
import { ListaAlertasComponent } from '../../shared/alertas/lista-alertas.component';
import { CurvaSComponent } from '../../shared/graficos/curva-s.component';

// Reporte del estado de la obra: una página para imprimir o guardar como PDF (Ctrl+P / botón)
// con datos del proyecto, plazo, avance, costos por rubro, cobranza, desvíos y alertas.
@Component({
  selector: 'app-reporte-obra',
  standalone: true,
  imports: [RouterLink, CurvaSComponent, ListaAlertasComponent],
  template: `
    <section class="page reporte">
      <div class="no-imprimir barra">
        <a class="btn btn--ghost" [routerLink]="['/proyectos', proyectoId()]">← Volver al proyecto</a>
        <button type="button" class="btn btn--primary" (click)="imprimir()">Imprimir / guardar PDF</button>
      </div>

      @if (proyecto.value(); as p) {
        @if (indicadores.value(); as i) {
          <header class="encabezado">
            <img src="assets/img/Logo_seyco.png" alt="Seyco S.A" class="logo" />
            <div>
              <h1>Reporte de estado de obra</h1>
              <div class="muted">Emitido el {{ fecha(hoyIso) }}</div>
            </div>
          </header>

          <h2>{{ p.nombre }}</h2>
          <dl class="datos">
            <div><dt>Cliente</dt><dd>{{ p.cliente ?? '—' }}</dd></div>
            <div><dt>Clasificación</dt><dd>{{ p.tipoCliente ? tipoClienteLabel[p.tipoCliente] : 'Sin clasificar' }}{{ p.tipoObra ? ' · ' + tipoObraLabel[p.tipoObra] : '' }}</dd></div>
            <div><dt>Estado</dt><dd>{{ estadoLabel[p.estado] }}</dd></div>
            <div><dt>Ref. cliente</dt><dd>{{ p.refCliente ?? '—' }}</dd></div>
            <div><dt>Plazo plan</dt><dd>{{ fecha(i.plazo.inicioPlan) }} → {{ fecha(i.plazo.finPlan) }} ({{ i.plazo.diasPlan ?? '—' }} días)</dd></div>
            <div><dt>Fin estimado</dt><dd>{{ fecha(i.plazo.finEstimado) }} {{ textoDesvio(i) }}</dd></div>
          </dl>

          <h3>Resumen</h3>
          <table class="tabla">
            <tbody>
              <tr><th>Avance físico real / planificado</th><td class="num">{{ numero(i.avanceReal) }} % / {{ numero(i.avancePlan) }} %</td></tr>
              <tr><th>SPI (cronograma) / CPI (costos)</th><td class="num">{{ i.spi != null ? numero(i.spi) : '—' }} / {{ i.cpi != null ? numero(i.cpi) : '—' }}</td></tr>
              <tr><th>Presupuesto (contrato, sin IVA)</th><td class="num">{{ pesos(i.presupuesto) }}</td></tr>
              <tr><th>Costo real acumulado</th><td class="num">{{ pesos(i.costoReal) }}</td></tr>
              <tr><th>Costo proyectado al final</th><td class="num">{{ i.costoProyectado != null ? pesos(i.costoProyectado) : '—' }}</td></tr>
            </tbody>
          </table>

          <h3>Costos por rubro: cotizado vs. real</h3>
          <table class="tabla">
            <thead><tr><th>Rubro</th><th class="num">Cotizado</th><th class="num">Real</th><th class="num">Desvío</th><th class="num">Consumido</th></tr></thead>
            <tbody>
              @for (r of i.rubros; track r.rubro) {
                <tr [class.excedido]="r.real > r.presupuestado">
                  <td>{{ rubroLabel[r.rubro] }}</td>
                  <td class="num">{{ pesos(r.presupuestado) }}</td>
                  <td class="num">{{ pesos(r.real) }}</td>
                  <td class="num">{{ r.desvio > 0 ? '+' : '' }}{{ pesos(r.desvio) }}</td>
                  <td class="num">{{ numero(r.porcentajeConsumido) }} %</td>
                </tr>
              }
            </tbody>
          </table>

          <h3>Certificación y cobranza</h3>
          <table class="tabla">
            <tbody>
              <tr><th>Certificado</th><td class="num">{{ pesos(i.certificacion.certificado) }} ({{ numero(i.certificacion.porcentajeCertificado) }} %)</td></tr>
              <tr><th>Cobrado</th><td class="num">{{ pesos(i.certificacion.cobrado) }} ({{ numero(i.certificacion.porcentajeCobrado) }} %)</td></tr>
              <tr><th>Pendiente de cobro</th><td class="num">{{ pesos(i.certificacion.pendienteCobro) }}</td></tr>
              <tr><th>Saldo por certificar</th><td class="num">{{ pesos(i.certificacion.saldoPorCertificar) }}</td></tr>
            </tbody>
          </table>
          @if (certificaciones.value().length) {
            <table class="tabla">
              <thead><tr><th>N°</th><th>Tipo</th><th>Emisión</th><th>Factura</th><th class="num">Monto</th><th>Cobro</th></tr></thead>
              <tbody>
                @for (c of certificaciones.value(); track c.id) {
                  <tr>
                    <td>{{ c.numero }}</td><td>{{ tipoCertLabel[c.tipo] }}</td><td>{{ fecha(c.fechaEmision) }}</td>
                    <td>{{ c.nroFactura ?? '—' }}</td><td class="num">{{ pesos(c.monto) }}</td>
                    <td>{{ c.estado === 'COBRADA' ? fecha(c.fechaCobro) : 'Pendiente' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }

          <h3>Curva S</h3>
          <app-curva-s [puntos]="i.curvaS" />

          @if (i.desvios.length) {
            <h3>Tareas atrasadas</h3>
            <table class="tabla">
              <thead><tr><th>N°</th><th>Tarea</th><th>Fin plan</th><th>Fin estimado</th><th class="num">Desvío</th><th class="num">Avance</th></tr></thead>
              <tbody>
                @for (d of i.desvios; track d.tareaId) {
                  <tr><td>{{ d.numero }}</td><td>{{ d.nombre }}</td><td>{{ fecha(d.finPlan) }}</td><td>{{ fecha(d.finEstimado) }}</td>
                    <td class="num">+{{ d.desvioDias }} d</td><td class="num">{{ d.avance }} %</td></tr>
                }
              </tbody>
            </table>
          }

          <h3>Alertas</h3>
          <app-lista-alertas [alertas]="i.alertas" />
        } @else {
          <p class="muted">Armando el reporte…</p>
        }
      } @else if (proyecto.error()) {
        <p class="error" role="alert">No se pudo cargar el proyecto.</p>
      }
    </section>
  `,
  styles: `
    .reporte { max-width: 56rem; background: var(--color-surface); margin-block: 1.5rem; border-radius: var(--radius-md); border: 1px solid var(--color-border); }
    .barra { display: flex; justify-content: space-between; gap: 0.5rem; margin-bottom: 1.5rem; }
    .barra a { text-decoration: none; }
    .encabezado { display: flex; align-items: center; gap: 1rem; border-bottom: 2px solid var(--color-primary); padding-bottom: 0.75rem; }
    .encabezado h1 { margin: 0; font-size: 1.3rem; color: var(--color-ink); }
    .logo { height: 2.6rem; }
    h2 { margin: 1.25rem 0 0.5rem; color: var(--color-ink); }
    h3 { margin: 1.4rem 0 0.5rem; font-size: 0.95rem; color: var(--color-primary-dark); text-transform: uppercase; letter-spacing: 0.03em; }
    .datos { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 0.4rem 1.5rem; margin: 0; font-size: 0.85rem; }
    .datos dt { color: var(--color-text-muted); font-size: 0.72rem; text-transform: uppercase; }
    .datos dd { margin: 0; font-weight: 600; }
    .tabla { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-bottom: 0.6rem; }
    .tabla th, .tabla td { border-bottom: 1px solid var(--color-border); padding: 0.4rem 0.5rem; text-align: left; }
    .tabla thead th { font-size: 0.7rem; text-transform: uppercase; color: var(--color-text-muted); }
    .tabla tbody th { font-weight: 500; }
    .tabla .num { text-align: right; }
    .excedido td { color: var(--color-danger); font-weight: 600; }
    @media print {
      .reporte { border: 0; margin: 0; padding: 0; max-width: none; }
      h3 { break-after: avoid; }
      .tabla, app-curva-s { break-inside: avoid; }
    }
  `,
})
export class ReporteObraComponent {
  readonly id = input.required<string>();
  protected readonly proyectoId = computed(() => Number(this.id()));

  protected readonly proyecto = httpResource<Proyecto>(() => `/api/proyectos/${this.proyectoId()}`);
  protected readonly indicadores = httpResource<Indicadores>(() => `/api/proyectos/${this.proyectoId()}/indicadores`);
  protected readonly certificaciones = httpResource<Certificacion[]>(
    () => `/api/proyectos/${this.proyectoId()}/certificaciones`,
    { defaultValue: [] },
  );

  protected readonly fecha = fecha;
  protected readonly pesos = pesos;
  protected readonly numero = numero;
  protected readonly hoyIso = hoy();
  protected readonly estadoLabel = ESTADO_PROYECTO_LABEL;
  protected readonly tipoClienteLabel = TIPO_CLIENTE_LABEL;
  protected readonly tipoObraLabel = TIPO_OBRA_LABEL;
  protected readonly rubroLabel = RUBRO_LABEL;
  protected readonly tipoCertLabel = TIPO_CERTIFICACION_LABEL;

  textoDesvio(i: Indicadores): string {
    const d = i.plazo.desvioDias;
    if (!i.lineaBaseFijada || d == null) return '(sin línea base)';
    if (d === 0) return '(en fecha)';
    return d > 0 ? `(+${d} días de atraso)` : `(${-d} días antes de lo cotizado)`;
  }

  imprimir(): void {
    window.print();
  }
}
