import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PuedeDirective } from '../../core/directives/puede.directive';
import { TotalesRubro } from '../../core/models/presupuesto.model';
import { CostoReal, CostoRealInput, RUBROS, RUBRO_COLOR, RUBRO_LABEL, Rubro } from '../../core/models/seguimiento.model';
import { SeguimientoService } from '../../core/services/seguimiento.service';
import { fecha, hoy, numero, pesos } from '../../core/utils/formato';
import { extraerMensajeError } from '../../core/utils/http-error';
import { ConfirmarDialogComponent } from '../../shared/confirmar/confirmar-dialog.component';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';

const CAMPO_RUBRO: Record<Rubro, keyof TotalesRubro> = {
  MANO_OBRA: 'manoObra',
  EQUIPOS: 'equipos',
  MATERIALES: 'materiales',
  TERCEROS: 'terceros',
};

// Solapa "Costos reales": lo que realmente se gasta en la obra, por rubro (horas de grúa,
// materiales, cuadrillas...), contra lo cotizado en el presupuesto.
@Component({
  selector: 'app-proyecto-costos',
  standalone: true,
  imports: [ReactiveFormsModule, PuedeDirective, ConfirmarDialogComponent],
  template: `
    <div class="seccion-apilada">
      <div class="kpis">
        @for (r of consumo(); track r.rubro) {
          <div class="kpi" [class.kpi--critico]="r.excedido">
            <div class="kpi__etiqueta"><span class="punto" [style.background]="r.color"></span>{{ r.etiqueta }}</div>
            <div class="kpi__valor">{{ pesos(r.real) }}</div>
            <div class="barra"><div [style.width.%]="r.porcentaje > 100 ? 100 : r.porcentaje" [class.excedida]="r.excedido"></div></div>
            <div class="kpi__nota">{{ numero(r.porcentaje) }} % de {{ pesos(r.cotizado) }} cotizados</div>
          </div>
        }
      </div>

      <section class="panel panel--tabla">
        <div class="panel__cabecera">
          <div>
            <h2 class="panel__titulo">Gastos de la obra</h2>
            <div class="panel__subtitulo">{{ visibles().length }} registros · {{ pesos(totalVisible()) }}</div>
          </div>
          <div class="acciones">
            <select class="filtro" [value]="filtro()" (change)="filtro.set($any($event.target).value)" aria-label="Filtrar por rubro">
              <option value="">Todos los rubros</option>
              @for (r of rubros; track r) {
                <option [value]="r">{{ rubroLabel[r] }}</option>
              }
            </select>
            <button type="button" class="btn btn--primary btn-chico-primario" *puede="'proyectos:editar'" (click)="abrir(null)">Cargar gasto</button>
          </div>
        </div>
        <div class="scroll">
          <table class="tabla-seguimiento">
            <thead><tr><th>Fecha</th><th>Rubro</th><th>Descripción</th><th>Comprobante</th><th class="num">Monto</th><th></th></tr></thead>
            <tbody>
              @for (c of visibles(); track c.id) {
                <tr>
                  <td>{{ fecha(c.fecha) }}</td>
                  <td><span class="punto" [style.background]="rubroColor[c.rubro]"></span>{{ rubroLabel[c.rubro] }}</td>
                  <td>{{ c.descripcion }}</td>
                  <td class="muted">{{ c.comprobante ?? '—' }}</td>
                  <td class="num">{{ pesos(c.monto) }}</td>
                  <td class="table__actions">
                    <ng-container *puede="'proyectos:editar'">
                      <button type="button" class="icon-btn icon-btn--edit" (click)="abrir(c)" aria-label="Editar gasto">✎</button>
                      <button type="button" class="icon-btn icon-btn--danger" (click)="eliminando.set(c)" aria-label="Eliminar gasto">✕</button>
                    </ng-container>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="muted">{{ recurso.isLoading() ? 'Cargando…' : 'Todavía no hay gastos cargados.' }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>

    @if (editando() !== undefined) {
      <button type="button" class="backdrop" aria-label="Cerrar" (click)="editando.set(undefined)"></button>
      <div class="dialog" role="dialog" aria-modal="true">
        <h2>{{ editando() ? 'Editar gasto' : 'Cargar gasto' }}</h2>
        <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
          @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
          <div class="field-row">
            <label class="field"><span>Fecha</span><input type="date" formControlName="fecha" /></label>
            <label class="field"><span>Rubro</span>
              <select formControlName="rubro">
                @for (r of rubros; track r) { <option [value]="r">{{ rubroLabel[r] }}</option> }
              </select>
            </label>
          </div>
          <label class="field"><span>Descripción</span><input type="text" formControlName="descripcion" placeholder="Ej.: 40 h de grúa 25 t" /></label>
          <div class="field-row">
            <label class="field"><span>Comprobante</span><input type="text" formControlName="comprobante" placeholder="Factura / remito" /></label>
            <label class="field"><span>Monto sin IVA ($)</span><input type="number" min="0" step="0.01" formControlName="monto" /></label>
          </div>
          <div class="dialog__actions">
            <button type="button" class="btn btn--ghost" (click)="editando.set(undefined)">Cancelar</button>
            <button type="submit" class="btn btn--primary" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : 'Guardar' }}</button>
          </div>
        </form>
      </div>
    }

    @if (eliminando(); as c) {
      <app-confirmar-dialog titulo="Eliminar gasto" pregunta="¿Desea eliminar el gasto" [nombre]="c.descripcion"
        [procesando]="guardando()" (confirmar)="eliminar(c)" (cancelar)="eliminando.set(null)" />
    }
  `,
  styles: `
    .punto { width: 9px; height: 9px; border-radius: 3px; display: inline-block; margin-right: 0.4rem; }
    .barra { height: 6px; background: var(--color-border); border-radius: 999px; overflow: hidden; margin-top: 0.4rem; }
    .barra div { height: 100%; background: var(--color-primary); border-radius: 999px; }
    .barra div.excedida { background: var(--color-danger); }
    .acciones { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .filtro { font: inherit; font-size: 0.8rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 0 0.6rem; min-height: 2.25rem; background: var(--color-surface); }
    .btn-chico-primario { font-size: 0.8rem; padding: 0.45rem 0.9rem; }
  `,
})
export class ProyectoCostosComponent {
  private readonly seguimiento = inject(SeguimientoService);
  private readonly snackbar = inject(SnackbarService);
  private readonly fb = inject(FormBuilder);

  readonly proyectoId = input.required<number>();
  // Totales del presupuesto importado (null en proyectos sin presupuesto).
  readonly cotizado = input<TotalesRubro | null>(null);

  protected readonly recurso = httpResource<CostoReal[]>(() => `/api/proyectos/${this.proyectoId()}/costos`, { defaultValue: [] });

  protected readonly rubros = RUBROS;
  protected readonly rubroLabel = RUBRO_LABEL;
  protected readonly rubroColor = RUBRO_COLOR;
  protected readonly pesos = pesos;
  protected readonly numero = numero;
  protected readonly fecha = fecha;

  protected readonly filtro = signal<Rubro | ''>('');
  protected readonly visibles = computed(() => this.recurso.value().filter((c) => !this.filtro() || c.rubro === this.filtro()));
  protected readonly totalVisible = computed(() => this.visibles().reduce((s, c) => s + c.monto, 0));

  protected readonly consumo = computed(() => {
    const cotizado = this.cotizado();
    return RUBROS.map((rubro) => {
      const real = this.recurso.value().filter((c) => c.rubro === rubro).reduce((s, c) => s + c.monto, 0);
      const plan = cotizado ? cotizado[CAMPO_RUBRO[rubro]] : 0;
      const porcentaje = plan ? Math.round((real / plan) * 1000) / 10 : 0;
      return { rubro, etiqueta: RUBRO_LABEL[rubro], color: RUBRO_COLOR[rubro], real, cotizado: plan, porcentaje, excedido: real > plan };
    });
  });

  // undefined = cerrado; null = alta; un costo = edición.
  protected readonly editando = signal<CostoReal | null | undefined>(undefined);
  protected readonly eliminando = signal<CostoReal | null>(null);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    fecha: ['', Validators.required],
    rubro: ['EQUIPOS' as Rubro, Validators.required],
    descripcion: ['', Validators.required],
    comprobante: [''],
    monto: [0, [Validators.required, Validators.min(0.01)]],
  });

  abrir(costo: CostoReal | null): void {
    this.form.reset(costo
      ? { fecha: costo.fecha, rubro: costo.rubro, descripcion: costo.descripcion, comprobante: costo.comprobante ?? '', monto: costo.monto }
      : { fecha: hoy(), rubro: 'EQUIPOS', descripcion: '', comprobante: '', monto: 0 });
    this.error.set(null);
    this.editando.set(costo);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.error.set('Completá fecha, rubro, descripción y un monto mayor a cero.');
      return;
    }
    const v = this.form.getRawValue();
    const datos: CostoRealInput = { ...v, comprobante: v.comprobante || null, monto: Number(v.monto) };
    const actual = this.editando();
    const pedido = actual
      ? this.seguimiento.actualizarCosto(this.proyectoId(), actual.id, datos)
      : this.seguimiento.crearCosto(this.proyectoId(), datos);
    this.guardando.set(true);
    pedido.subscribe({
      next: () => {
        this.guardando.set(false);
        this.editando.set(undefined);
        this.recurso.reload();
        this.snackbar.mostrar('Gasto guardado.');
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(extraerMensajeError(err, 'No se pudo guardar el gasto.'));
      },
    });
  }

  eliminar(costo: CostoReal): void {
    this.guardando.set(true);
    this.seguimiento.eliminarCosto(this.proyectoId(), costo.id).subscribe({
      next: () => {
        this.guardando.set(false);
        this.eliminando.set(null);
        this.recurso.reload();
        this.snackbar.mostrar('Gasto eliminado.');
      },
      error: (err) => {
        this.guardando.set(false);
        this.eliminando.set(null);
        this.snackbar.mostrar(extraerMensajeError(err, 'No se pudo eliminar el gasto.'), 'error');
      },
    });
  }
}
