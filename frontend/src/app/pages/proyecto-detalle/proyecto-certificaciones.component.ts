import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PuedeDirective } from '../../core/directives/puede.directive';
import {
  Certificacion,
  CertificacionInput,
  ESTADO_CERTIFICACION_LABEL,
  EstadoCertificacion,
  ResumenCertificacion,
  TIPO_CERTIFICACION_LABEL,
  TipoCertificacion,
} from '../../core/models/seguimiento.model';
import { SeguimientoService } from '../../core/services/seguimiento.service';
import { diasEntre, fecha, hoy, numero, pesos } from '../../core/utils/formato';
import { extraerMensajeError } from '../../core/utils/http-error';
import { ConfirmarDialogComponent } from '../../shared/confirmar/confirmar-dialog.component';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';

// Solapa "Certificaciones": certificar una obra es cobrarla. Se arranca con un anticipo (~30 %),
// se certifican avances cada 2 o 3 meses y se cierra con el final. La barra muestra cuánto del
// contrato está cobrado, pendiente de cobro y sin certificar, para que no quede un saldo olvidado.
@Component({
  selector: 'app-proyecto-certificaciones',
  standalone: true,
  imports: [ReactiveFormsModule, PuedeDirective, ConfirmarDialogComponent],
  template: `
    <div class="seccion-apilada">
      @if (resumen.value(); as r) {
        <div class="kpis">
          <div class="kpi"><div class="kpi__etiqueta">Monto del contrato</div><div class="kpi__valor">{{ r.montoContrato != null ? pesos(r.montoContrato) : '—' }}</div><div class="kpi__nota">Total del presupuesto, sin IVA</div></div>
          <div class="kpi"><div class="kpi__etiqueta">Certificado</div><div class="kpi__valor">{{ pesos(r.certificado) }}</div><div class="kpi__nota">{{ numero(r.porcentajeCertificado) }} % del contrato</div></div>
          <div class="kpi kpi--ok"><div class="kpi__etiqueta">Cobrado</div><div class="kpi__valor">{{ pesos(r.cobrado) }}</div><div class="kpi__nota">{{ numero(r.porcentajeCobrado) }} % del contrato</div></div>
          <div class="kpi" [class.kpi--riesgo]="r.pendienteCobro > 0"><div class="kpi__etiqueta">Pendiente de cobro</div><div class="kpi__valor">{{ pesos(r.pendienteCobro) }}</div><div class="kpi__nota">Certificado y no cobrado</div></div>
          <div class="kpi" [class.kpi--riesgo]="r.saldoPorCertificar > 0"><div class="kpi__etiqueta">Saldo por certificar</div><div class="kpi__valor">{{ pesos(r.saldoPorCertificar) }}</div><div class="kpi__nota">{{ r.diasDesdeUltima != null ? 'Última certificación hace ' + r.diasDesdeUltima + ' días' : 'Sin certificaciones' }}</div></div>
        </div>
        <section class="panel">
          <h2 class="panel__titulo">Estado de cobro del contrato</h2>
          <div class="cobro" role="img" [attr.aria-label]="textoBarra(r)">
            <div class="cobro__cobrado" [style.width.%]="r.porcentajeCobrado"></div>
            <div class="cobro__pendiente" [style.width.%]="r.porcentajeCertificado - r.porcentajeCobrado"></div>
          </div>
          <div class="leyenda">
            <span><span class="punto punto--cobrado"></span>Cobrado {{ numero(r.porcentajeCobrado) }} %</span>
            <span><span class="punto punto--pendiente"></span>Pendiente de cobro {{ numero(r.porcentajeCertificado - r.porcentajeCobrado) }} %</span>
            <span><span class="punto"></span>Sin certificar {{ numero(100 - r.porcentajeCertificado) }} %</span>
          </div>
        </section>
      }

      <section class="panel panel--tabla">
        <div class="panel__cabecera">
          <div>
            <h2 class="panel__titulo">Certificaciones</h2>
            <div class="panel__subtitulo">Anticipo, certificados de avance y certificado final</div>
          </div>
          <button type="button" class="btn btn--primary boton" *puede="'proyectos:editar'" (click)="abrir(null)">Nueva certificación</button>
        </div>
        <div class="scroll">
          <table class="tabla-seguimiento">
            <thead><tr><th>N°</th><th>Tipo</th><th>Emisión</th><th>Factura</th><th class="num">%</th><th class="num">Monto</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              @for (c of lista.value(); track c.id) {
                <tr>
                  <td>{{ c.numero }}</td>
                  <td>{{ tipoLabel[c.tipo] }}</td>
                  <td>{{ fecha(c.fechaEmision) }}</td>
                  <td class="muted">{{ c.nroFactura ?? '—' }}</td>
                  <td class="num">{{ c.porcentaje != null ? numero(c.porcentaje) + ' %' : '—' }}</td>
                  <td class="num">{{ pesos(c.monto) }}</td>
                  <td>
                    @if (c.estado === 'COBRADA') {
                      <span class="badge badge--ok">Cobrada el {{ fecha(c.fechaCobro) }}</span>
                    } @else {
                      <span class="badge" [class]="diasSinCobrar(c) > 60 ? 'badge badge--critico' : 'badge badge--riesgo'">Pendiente · {{ diasSinCobrar(c) }} días</span>
                    }
                  </td>
                  <td class="table__actions">
                    <ng-container *puede="'proyectos:editar'">
                      @if (c.estado !== 'COBRADA') {
                        <button type="button" class="btn-chico" (click)="cobrar(c)">Registrar cobro</button>
                      }
                      <button type="button" class="icon-btn icon-btn--edit" (click)="abrir(c)" aria-label="Editar certificación">✎</button>
                      <button type="button" class="icon-btn icon-btn--danger" (click)="eliminando.set(c)" aria-label="Eliminar certificación">✕</button>
                    </ng-container>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="muted">Sin certificaciones. La obra normalmente arranca con un anticipo del 30 %.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>

    @if (editando() !== undefined) {
      <button type="button" class="backdrop" aria-label="Cerrar" (click)="editando.set(undefined)"></button>
      <div class="dialog" role="dialog" aria-modal="true">
        <h2>{{ editando() ? 'Editar certificación N° ' + editando()!.numero : 'Nueva certificación' }}</h2>
        <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
          @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
          <div class="field-row">
            <label class="field"><span>Tipo</span>
              <select formControlName="tipo">
                @for (t of tipos; track t) { <option [value]="t">{{ tipoLabel[t] }}</option> }
              </select>
            </label>
            <label class="field"><span>Fecha de emisión</span><input type="date" formControlName="fechaEmision" /></label>
          </div>
          <div class="field-row">
            <label class="field"><span>% del contrato</span><input type="number" min="0" max="100" step="0.5" formControlName="porcentaje" /></label>
            <label class="field"><span>Monto sin IVA ($)</span><input type="number" min="0" step="0.01" formControlName="monto" /></label>
          </div>
          <small class="field__hint">Si cargás sólo el porcentaje, el monto se calcula sobre el contrato.</small>
          <div class="field-row">
            <label class="field"><span>N° de factura</span><input type="text" formControlName="nroFactura" /></label>
            <label class="field"><span>Estado</span>
              <select formControlName="estado">
                @for (e of estados; track e) { <option [value]="e">{{ estadoLabel[e] }}</option> }
              </select>
            </label>
          </div>
          @if (form.controls.estado.value === 'COBRADA') {
            <label class="field"><span>Fecha de cobro</span><input type="date" formControlName="fechaCobro" /></label>
          }
          <label class="field"><span>Observaciones</span><input type="text" formControlName="observaciones" placeholder="Ej.: 200 m de zanjeo" /></label>
          <div class="dialog__actions">
            <button type="button" class="btn btn--ghost" (click)="editando.set(undefined)">Cancelar</button>
            <button type="submit" class="btn btn--primary" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : 'Guardar' }}</button>
          </div>
        </form>
      </div>
    }

    @if (eliminando(); as c) {
      <app-confirmar-dialog titulo="Eliminar certificación" pregunta="¿Desea eliminar la certificación" [nombre]="'N° ' + c.numero"
        [procesando]="guardando()" (confirmar)="eliminar(c)" (cancelar)="eliminando.set(null)" />
    }
  `,
  styles: `
    .cobro { display: flex; height: 16px; border-radius: 999px; overflow: hidden; background: var(--color-border); gap: 2px; }
    .cobro__cobrado { background: var(--color-success); }
    .cobro__pendiente { background: var(--color-accent); }
    .leyenda { display: flex; gap: 1.25rem; flex-wrap: wrap; margin-top: 0.6rem; font-size: 0.8rem; color: var(--color-text-muted); }
    .leyenda > span { display: inline-flex; align-items: center; gap: 0.4rem; }
    .punto { width: 10px; height: 10px; border-radius: 3px; background: var(--color-border); }
    .punto--cobrado { background: var(--color-success); }
    .punto--pendiente { background: var(--color-accent); }
    .boton { font-size: 0.8rem; padding: 0.45rem 0.9rem; }
    .table__actions .btn-chico { margin-right: 0.25rem; }
  `,
})
export class ProyectoCertificacionesComponent {
  private readonly seguimiento = inject(SeguimientoService);
  private readonly snackbar = inject(SnackbarService);
  private readonly fb = inject(FormBuilder);

  readonly proyectoId = input.required<number>();

  protected readonly lista = httpResource<Certificacion[]>(() => `/api/proyectos/${this.proyectoId()}/certificaciones`, { defaultValue: [] });
  protected readonly resumen = httpResource<ResumenCertificacion>(() => `/api/proyectos/${this.proyectoId()}/certificaciones/resumen`);

  protected readonly pesos = pesos;
  protected readonly numero = numero;
  protected readonly fecha = fecha;
  protected readonly tipoLabel = TIPO_CERTIFICACION_LABEL;
  protected readonly estadoLabel = ESTADO_CERTIFICACION_LABEL;
  protected readonly tipos = Object.keys(TIPO_CERTIFICACION_LABEL) as TipoCertificacion[];
  protected readonly estados = Object.keys(ESTADO_CERTIFICACION_LABEL) as EstadoCertificacion[];

  protected readonly editando = signal<Certificacion | null | undefined>(undefined);
  protected readonly eliminando = signal<Certificacion | null>(null);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = this.fb.group({
    tipo: ['AVANCE' as TipoCertificacion],
    fechaEmision: [''],
    porcentaje: [null as number | null],
    monto: [null as number | null],
    nroFactura: [''],
    estado: ['PENDIENTE_COBRO' as EstadoCertificacion],
    fechaCobro: [''],
    observaciones: [''],
  });

  private readonly sinCertificaciones = computed(() => this.lista.value().length === 0);

  diasSinCobrar(c: Certificacion): number {
    return diasEntre(c.fechaEmision, hoy());
  }

  textoBarra(r: ResumenCertificacion): string {
    return `Cobrado ${numero(r.porcentajeCobrado)} %, certificado ${numero(r.porcentajeCertificado)} % del contrato`;
  }

  // La primera certificación se propone como anticipo del 30 %.
  abrir(c: Certificacion | null): void {
    this.form.reset(c
      ? { tipo: c.tipo, fechaEmision: c.fechaEmision, porcentaje: c.porcentaje, monto: c.monto, nroFactura: c.nroFactura ?? '',
          estado: c.estado, fechaCobro: c.fechaCobro ?? '', observaciones: c.observaciones ?? '' }
      : { tipo: this.sinCertificaciones() ? 'ANTICIPO' : 'AVANCE', fechaEmision: hoy(), porcentaje: this.sinCertificaciones() ? 30 : null,
          monto: null, nroFactura: '', estado: 'PENDIENTE_COBRO', fechaCobro: '', observaciones: '' });
    this.error.set(null);
    this.editando.set(c);
  }

  guardar(): void {
    const v = this.form.getRawValue();
    const actual = this.editando();
    // Al editar, si cambió el porcentaje y no el monto, se recalcula el monto.
    const porcentajeCambio = actual != null && v.porcentaje !== actual.porcentaje && Number(v.monto) === actual.monto;
    const datos: CertificacionInput = {
      tipo: v.tipo ?? 'AVANCE',
      fechaEmision: v.fechaEmision || hoy(),
      porcentaje: v.porcentaje != null && String(v.porcentaje) !== '' ? Number(v.porcentaje) : null,
      monto: v.monto != null && String(v.monto) !== '' && !porcentajeCambio ? Number(v.monto) : null,
      nroFactura: v.nroFactura || null,
      estado: v.estado ?? 'PENDIENTE_COBRO',
      fechaCobro: v.estado === 'COBRADA' ? v.fechaCobro || null : null,
      observaciones: v.observaciones || null,
    };
    const pedido = actual
      ? this.seguimiento.actualizarCertificacion(this.proyectoId(), actual.id, datos)
      : this.seguimiento.crearCertificacion(this.proyectoId(), datos);
    this.guardando.set(true);
    pedido.subscribe({
      next: () => this.listo('Certificación guardada.'),
      error: (err) => {
        this.guardando.set(false);
        this.error.set(extraerMensajeError(err, 'No se pudo guardar la certificación.'));
      },
    });
  }

  cobrar(c: Certificacion): void {
    this.seguimiento.registrarCobro(this.proyectoId(), c.id, hoy()).subscribe({
      next: () => this.listo(`Cobro de la certificación N° ${c.numero} registrado.`),
      error: (err) => this.snackbar.mostrar(extraerMensajeError(err, 'No se pudo registrar el cobro.'), 'error'),
    });
  }

  eliminar(c: Certificacion): void {
    this.guardando.set(true);
    this.seguimiento.eliminarCertificacion(this.proyectoId(), c.id).subscribe({
      next: () => this.listo('Certificación eliminada.'),
      error: (err) => {
        this.guardando.set(false);
        this.eliminando.set(null);
        this.snackbar.mostrar(extraerMensajeError(err, 'No se pudo eliminar la certificación.'), 'error');
      },
    });
  }

  private listo(mensaje: string): void {
    this.guardando.set(false);
    this.editando.set(undefined);
    this.eliminando.set(null);
    this.lista.reload();
    this.resumen.reload();
    this.snackbar.mostrar(mensaje);
  }
}
