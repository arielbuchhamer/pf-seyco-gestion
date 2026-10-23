import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PuedeDirective } from '../../core/directives/puede.directive';
import { PresupuestoDetalle } from '../../core/models/presupuesto.model';
import {
  ESTADO_PROYECTO_LABEL,
  Proyecto,
  ProyectoInput,
  TIPOS_CLIENTE,
  TIPOS_OBRA,
  TIPO_CLIENTE_LABEL,
  TIPO_OBRA_LABEL,
  TipoCliente,
  TipoObra,
} from '../../core/models/proyecto.model';
import { Tarea } from '../../core/models/tarea.model';
import { ImportacionService } from '../../core/services/importacion.service';
import { ProyectoService } from '../../core/services/proyecto.service';
import { estaVencido } from '../../core/utils/fecha';
import { fecha, pesosCorto } from '../../core/utils/formato';
import { extraerMensajeError } from '../../core/utils/http-error';
import { ConfirmarDialogComponent } from '../../shared/confirmar/confirmar-dialog.component';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';
import { ProyectoCertificacionesComponent } from './proyecto-certificaciones.component';
import { ProyectoCostosComponent } from './proyecto-costos.component';
import { ProyectoGanttComponent } from './proyecto-gantt.component';
import { ProyectoIndicadoresComponent } from './proyecto-indicadores.component';
import { ProyectoPresupuestoComponent } from './proyecto-presupuesto.component';
import { TareasComponent } from '../tareas/tareas.component';
import { ProyectoTareasComponent } from './proyecto-tareas.component';

type Solapa = 'tareas' | 'fechas' | 'gantt' | 'indicadores' | 'costos' | 'certificaciones' | 'presupuesto';

// Vista del proyecto con solapas Tareas, Carga de fechas, Gantt, Indicadores, Costos reales, Certificaciones y
// Presupuesto (el ciclo del prototipo: importar → fechas → Gantt → KPIs). La carga de fechas
// es la grilla de la pantalla Tareas en modo embebido. Editar y eliminar el proyecto están
// acá (el listado ya no tiene acciones: es "importar + últimos proyectos").
@Component({
  selector: 'app-proyecto-detalle',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PuedeDirective,
    ConfirmarDialogComponent,
    ProyectoTareasComponent,
    ProyectoPresupuestoComponent,
    ProyectoGanttComponent,
    TareasComponent,
    ProyectoIndicadoresComponent,
    ProyectoCostosComponent,
    ProyectoCertificacionesComponent,
  ],
  templateUrl: './proyecto-detalle.component.html',
  styleUrl: './proyecto-detalle.component.css',
})
export class ProyectoDetalleComponent {
  private readonly proyectoService = inject(ProyectoService);
  private readonly importacion = inject(ImportacionService);
  private readonly snackbar = inject(SnackbarService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly id = input.required<string>();
  protected readonly proyectoId = computed(() => Number(this.id()));

  protected readonly estadoLabel = ESTADO_PROYECTO_LABEL;
  protected readonly fecha = fecha;
  protected readonly pesosCorto = pesosCorto;
  protected readonly tiposCliente = TIPOS_CLIENTE;
  protected readonly tiposObra = TIPOS_OBRA;
  protected readonly tipoClienteLabel = TIPO_CLIENTE_LABEL;
  protected readonly tipoObraLabel = TIPO_OBRA_LABEL;

  protected readonly proyectoResource = httpResource<Proyecto>(() => `/api/proyectos/${this.proyectoId()}`);

  protected readonly tareasResource = httpResource<Tarea[]>(
    () => ({ url: '/api/tareas', params: { proyectoId: this.proyectoId() } }),
    { defaultValue: [] },
  );

  // Los proyectos anteriores a la importación no tienen presupuesto (404): sin solapa Presupuesto.
  protected readonly presupuestoResource = httpResource<PresupuestoDetalle>(
    () => `/api/proyectos/${this.proyectoId()}/presupuesto`,
  );
  protected readonly presupuesto = computed(() =>
    this.presupuestoResource.hasValue() ? this.presupuestoResource.value() : null,
  );

  protected readonly cantidadTareas = computed(() => this.tareasResource.value().filter((t) => t.padreId == null).length);

  protected readonly vencido = computed(() => {
    const p = this.proyectoResource.value();
    return p ? estaVencido(p.fechaFin, p.estado) : false;
  });

  protected readonly solapa = signal<Solapa>('tareas');
  // Orden del ciclo del proyecto; Presupuesto sólo si el proyecto se importó con uno.
  protected readonly solapasVisibles = computed<{ id: Solapa; label: string; contador?: string }[]>(() => {
    const p = this.presupuesto();
    return [
      { id: 'tareas', label: 'Tareas', contador: String(this.cantidadTareas()) },
      { id: 'fechas', label: 'Carga de fechas' },
      { id: 'gantt', label: 'Gantt' },
      { id: 'indicadores', label: 'Indicadores' },
      { id: 'costos', label: 'Costos reales' },
      { id: 'certificaciones', label: 'Certificaciones' },
      ...(p ? [{ id: 'presupuesto' as Solapa, label: 'Presupuesto', contador: pesosCorto(p.totales.total) }] : []),
    ];
  });
  protected readonly abrirEnPresupuesto = signal<string[] | null>(null);

  irAlPresupuesto(camino: string[]): void {
    this.abrirEnPresupuesto.set(camino);
    this.solapa.set('presupuesto');
  }

  verSolapa(solapa: Solapa): void {
    if (solapa === 'presupuesto') this.abrirEnPresupuesto.set(null);
    this.solapa.set(solapa);
  }

  recargar(): void {
    this.tareasResource.reload();
    this.proyectoResource.reload();
  }

  descargarExcel(proyecto: Proyecto): void {
    this.importacion.descargarExcelOriginal(proyecto.id, proyecto.archivoNombre ?? 'proyecto.xls').subscribe({
      error: (err) => this.snackbar.mostrar(extraerMensajeError(err, 'No se pudo descargar el Excel.'), 'error'),
    });
  }

  // ── Editar / eliminar proyecto ──
  protected readonly mostrarEditar = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorForm = signal<string | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    cliente: [''],
    atencion: [''],
    refCliente: [''],
    descripcion: [''],
    fechaInicio: [''],
    fechaFin: [''],
    tipoCliente: [''],
    tipoObra: [''],
  });

  abrirEditar(): void {
    const p = this.proyectoResource.value();
    if (!p) return;
    this.form.reset({
      nombre: p.nombre,
      cliente: p.cliente ?? '',
      atencion: p.atencion ?? '',
      refCliente: p.refCliente ?? '',
      descripcion: p.descripcion ?? '',
      fechaInicio: p.fechaInicio ?? '',
      fechaFin: p.fechaFin ?? '',
      tipoCliente: p.tipoCliente ?? '',
      tipoObra: p.tipoObra ?? '',
    });
    this.errorForm.set(null);
    this.mostrarEditar.set(true);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { tipoCliente, tipoObra, ...resto } = this.form.getRawValue();
    const payload: ProyectoInput = {
      ...resto,
      tipoCliente: (tipoCliente || null) as TipoCliente | null,
      tipoObra: (tipoObra || null) as TipoObra | null,
    };
    this.guardando.set(true);
    this.errorForm.set(null);
    this.proyectoService.actualizar(this.proyectoId(), payload).subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarEditar.set(false);
        this.proyectoResource.reload();
        this.snackbar.mostrar('Proyecto guardado.');
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorForm.set(extraerMensajeError(err, 'No se pudo guardar el proyecto.'));
      },
    });
  }

  protected readonly confirmandoEliminar = signal(false);
  protected readonly eliminando = signal(false);

  eliminar(): void {
    this.eliminando.set(true);
    this.proyectoService.eliminar(this.proyectoId()).subscribe({
      next: () => {
        this.snackbar.mostrar('Proyecto eliminado.');
        this.router.navigate(['/proyectos']);
      },
      error: (err) => {
        this.eliminando.set(false);
        this.confirmandoEliminar.set(false);
        this.snackbar.mostrar(extraerMensajeError(err, 'No se pudo eliminar el proyecto.'), 'error');
      },
    });
  }
}
