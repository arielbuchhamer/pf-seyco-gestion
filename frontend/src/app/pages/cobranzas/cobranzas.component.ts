import { httpResource } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ESTADO_PROYECTO_LABEL } from '../../core/models/proyecto.model';
import { Cobranzas, NivelAlerta, TIPO_CERTIFICACION_LABEL } from '../../core/models/seguimiento.model';
import { SeguimientoService } from '../../core/services/seguimiento.service';
import { fecha, numero, pesos, pesosCorto } from '../../core/utils/formato';
import { CabeceraComponent } from '../../shared/cabecera/cabecera.component';
import { KpiComponent } from '../../shared/kpi/kpi.component';
import { PaginadorComponent, paginacion } from '../../shared/paginador/paginador.component';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';

// Cobranzas (Gestión global): toda la plata que falta entrar, en todas las obras, para que el
// saldo final no se pierda porque "nadie lo sigue". Primero las obras más urgentes (terminadas con
// saldo sin certificar) y abajo las facturas emitidas sin cobrar, de la más vieja a la más nueva.
// Datos: GET /api/cobranzas (CobranzaService en el backend).
@Component({
  selector: 'app-cobranzas',
  standalone: true,
  imports: [RouterLink, CabeceraComponent, KpiComponent, PaginadorComponent],
  template: `
    <section class="page cobranzas">
      <nav class="breadcrumb" aria-label="Ruta">
        <a routerLink="/dashboard">Menú principal</a>
        <span aria-hidden="true">/</span>
        <a routerLink="/cobranzas" aria-current="page">Cobranzas</a>
      </nav>

      <app-cabecera titulo="Cobranzas" subtitulo="Lo que falta certificar y cobrar en todas las obras.">
        <button type="button" class="boton-cabecera" [disabled]="descargando() || !recurso.value()" (click)="descargarExcel()">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
            <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {{ descargando() ? 'Descargando…' : 'Excel' }}
        </button>
      </app-cabecera>

      @if (recurso.error()) {
        <p class="error" role="alert">No se pudieron cargar las cobranzas. Si el backend se actualizó, reinicialo.</p>
      } @else if (recurso.value(); as c) {
        <div class="tablero__kpis tablero__kpis--4">
          <app-kpi etiqueta="Falta cobrar en total" icono="cartera" [valor]="pesosCorto(c.porCobrar)"
            nota="Sin certificar + facturado sin cobrar" />
          <app-kpi etiqueta="Facturado sin cobrar" icono="factura" [valor]="pesosCorto(c.facturadoSinCobrar)"
            [tono]="c.facturas.length ? 'riesgo' : 'neutro'"
            [nota]="c.facturas.length + (c.facturas.length === 1 ? ' factura pendiente' : ' facturas pendientes') + (c.facturadoSinCobrarCac != null ? ' · con índice CAC hoy ' + pesosCorto(c.facturadoSinCobrarCac) : '')" />
          <app-kpi etiqueta="Sin certificar" icono="costo" [valor]="pesosCorto(c.sinCertificar)"
            nota="Trabajo del contrato todavía no facturado" />
          <app-kpi etiqueta="Se puede perder" icono="alerta" [valor]="pesosCorto(c.sinCertificarTerminadas)"
            [tono]="c.obrasTerminadasConSaldo ? 'critico' : 'ok'"
            [nota]="c.obrasTerminadasConSaldo ? c.obrasTerminadasConSaldo + ' obras terminadas con saldo sin certificar' : 'Ninguna obra terminada con saldo'" />
        </div>

        <div class="tablas">
        <section class="panel tablero__panel">
          <div class="tablero__cabecera">
            <div><h3>Obras con plata pendiente</h3><span class="muted chico">Primero las más urgentes</span></div>
          </div>
          @if (c.obras.length) {
            <div class="tabla-scroll">
              <table class="tabla-obras">
                <thead>
                  <tr>
                    <th>Prioridad</th><th>Obra</th><th>Avance</th><th>Certificado</th>
                    <th class="num">Facturado sin cobrar</th><th class="num">Sin certificar</th><th class="num">Falta cobrar</th><th>Por qué</th>
                  </tr>
                </thead>
                <tbody>
                  @for (o of obras.pagina().items; track o.proyectoId) {
                    <tr>
                      <td><span class="badge" [class]="'badge ' + badge[o.nivel]">{{ prioridad[o.nivel] }}</span></td>
                      <td>
                        <a class="obra-link" [routerLink]="['/proyectos', o.proyectoId]" [queryParams]="{ solapa: 'certificaciones' }">{{ o.nombre }}</a>
                        <div class="muted chico">{{ o.cliente ?? 'Sin cliente' }} · {{ estadoLabel[o.estado] }}</div>
                      </td>
                      <td class="chico">{{ redondo(o.avanceReal) }} %</td>
                      <td class="chico">{{ redondo(o.certificacion.porcentajeCertificado) }} %</td>
                      <td class="num">{{ pesosCorto(o.certificacion.pendienteCobro) }}</td>
                      <td class="num"><strong [class.texto-critico]="o.nivel === 'CRITICA'">{{ pesosCorto(o.certificacion.saldoPorCertificar) }}</strong></td>
                      <td class="num"><strong>{{ pesosCorto(o.certificacion.saldoPorCobrar) }}</strong></td>
                      <td class="chico">{{ o.motivo }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <app-paginador [pagina]="obras.pagina()" (cambiar)="obras.actual.set($event)" />
          } @else {
            <p class="muted">No hay plata pendiente: todas las obras están certificadas y cobradas.</p>
          }
        </section>

        <section class="panel tablero__panel">
          <div class="tablero__cabecera">
            <div><h3>Facturas sin cobrar</h3><span class="muted chico">Certificaciones emitidas, de la más vieja a la más nueva</span></div>
          </div>
          @if (c.facturas.length) {
            <div class="tabla-scroll">
              <table class="tabla-obras">
                <thead>
                  <tr><th>Obra</th><th>Certificación</th><th>Emitida</th><th>Factura</th><th class="num">Monto original</th><th class="num">Con índice CAC hoy</th><th class="num">Días sin cobrar</th></tr>
                </thead>
                <tbody>
                  @for (f of facturas.pagina().items; track f.certificacionId) {
                    <tr>
                      <td><a class="obra-link" [routerLink]="['/proyectos', f.proyectoId]" [queryParams]="{ solapa: 'certificaciones' }">{{ f.proyecto }}</a></td>
                      <td>N.º {{ f.numero }} · {{ tipoLabel[f.tipo] }}</td>
                      <td>{{ fecha(f.fechaEmision) }}</td>
                      <td class="muted">{{ f.nroFactura ?? '—' }}</td>
                      <td class="num">{{ pesos(f.monto) }}</td>
                      <td class="num">
                        @if (f.montoActualizado != null) {
                          <span class="monto-cac">{{ pesos(f.montoActualizado) }}</span>
                          <span class="nota-cac">Actualizado al día de hoy · CAC {{ mes(f.cacPeriodo) }}</span>
                        } @else {
                          <span class="muted">—</span>
                          <span class="nota-cac nota-cac--gris">Índice CAC no disponible</span>
                        }
                      </td>
                      <td class="num"><span class="badge" [class]="'badge ' + (f.dias > 60 ? 'badge--critico' : f.dias > 30 ? 'badge--riesgo' : 'badge--ok')">{{ f.dias }} días</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <app-paginador [pagina]="facturas.pagina()" (cambiar)="facturas.actual.set($event)" />
          } @else {
            <p class="muted">No hay facturas pendientes de cobro.</p>
          }
        </section>
        </div>
      } @else {
        <p class="muted">Cargando cobranzas…</p>
      }
    </section>
  `,
  styles: `
    /* Ancho completo y alto de la ventana: las dos tablas se reparten el alto que queda y
       scrollean adentro, con el paginador siempre abajo. En pantallas bajas, alto natural. */
    .page.cobranzas {
      max-width: none;
      padding: 1.25rem clamp(1rem, 3.5vw, 3rem) 1.5rem;
      height: calc(100dvh - var(--alto-topbar));
      min-height: 44rem;
      display: flex;
      flex-direction: column;
    }
    .tablero__kpis { margin-bottom: 1rem; }
    .tablas { flex: 1; min-height: 0; display: grid; grid-template-rows: minmax(0, 3fr) minmax(0, 2fr); gap: 1rem; }
    .tablero__panel { display: flex; flex-direction: column; min-height: 0; }
    .tabla-scroll { flex: 1; min-height: 0; overflow: auto; }
    @media (max-width: 900px), (max-height: 700px) {
      .page.cobranzas { height: auto; }
      .tablas { grid-template-rows: auto auto; }
    }
    .obra-link { color: var(--color-primary); font-weight: 600; text-decoration: none; }
    .obra-link:hover { text-decoration: underline; }
  `,
})
export class CobranzasComponent {
  private readonly seguimiento = inject(SeguimientoService);
  private readonly snackbar = inject(SnackbarService);

  protected readonly recurso = httpResource<Cobranzas>(() => '/api/cobranzas');
  protected readonly obras = paginacion(() => this.recurso.value()?.obras ?? []);
  protected readonly facturas = paginacion(() => this.recurso.value()?.facturas ?? []);
  protected readonly descargando = signal(false);

  protected readonly pesos = pesos;

  // "octubre de 2026" a partir del día 1 del mes (yyyy-mm-dd).
  mes(iso: string | null | undefined): string {
    return iso ? new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) : '';
  }
  protected readonly pesosCorto = pesosCorto;
  protected readonly fecha = fecha;
  protected readonly estadoLabel = ESTADO_PROYECTO_LABEL;
  protected readonly tipoLabel = TIPO_CERTIFICACION_LABEL;
  protected readonly prioridad: Record<NivelAlerta, string> = { CRITICA: 'Urgente', ADVERTENCIA: 'Revisar', INFO: 'Al día' };
  protected readonly badge: Record<NivelAlerta, string> = { CRITICA: 'badge--critico', ADVERTENCIA: 'badge--riesgo', INFO: 'badge--ok' };

  redondo(valor: number): string {
    return numero(Math.round(valor));
  }

  descargarExcel(): void {
    this.descargando.set(true);
    this.seguimiento.descargarCobranzas().subscribe({
      next: () => this.descargando.set(false),
      error: () => {
        this.descargando.set(false);
        this.snackbar.mostrar('No se pudo descargar el Excel.', 'error');
      },
    });
  }
}
