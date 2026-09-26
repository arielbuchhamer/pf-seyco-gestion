import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TieneRolDirective } from '../../core/directives/tiene-rol.directive';
import {
  CambioEstadoTarea,
  TareasKanbanComponent,
} from '../../shared/tareas-kanban/tareas-kanban.component';
import { extraerMensajeError } from '../../core/utils/http-error';
import { AuthService } from '../../core/services/auth.service';
import { Usuario } from '../../core/models/usuario.model';
import {
  ESTADO_PROYECTO_LABEL,
  Progreso,
  Proyecto,
  ProyectoInput,
  Rendimiento,
} from '../../core/models/proyecto.model';
import { ProyectoService } from '../../core/services/proyecto.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { estaVencido } from '../../core/utils/fecha';
import { ESTADOS_TAREA, ESTADO_TAREA_LABEL, Tarea, TareaInput } from '../../core/models/tarea.model';
import { TareaService } from '../../core/services/tarea.service';

@Component({
  selector: 'app-proyecto-detalle',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TieneRolDirective, TareasKanbanComponent],
  templateUrl: './proyecto-detalle.component.html',
  styleUrl: './proyecto-detalle.component.css',
})
export class ProyectoDetalleComponent {
  private readonly proyectoService = inject(ProyectoService);
  private readonly tareaService = inject(TareaService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);

  // Con withComponentInputBinding() (ver app.config.ts) el :id de la ruta llega directo
  // acá, sin inyectar ActivatedRoute ni suscribirse a paramMap a mano.
  readonly id = input.required<string>();
  private readonly proyectoId = computed(() => Number(this.id()));

  protected readonly estadoProyectoLabel = ESTADO_PROYECTO_LABEL;
  protected readonly estadoTareaLabel = ESTADO_TAREA_LABEL;
  protected readonly estadosTarea = ESTADOS_TAREA;

  protected readonly proyectoResource = httpResource<Proyecto>(() => ({
    url: `/api/proyectos/${this.proyectoId()}`,
  }));

  protected readonly vencido = computed(() => {
    const proyecto = this.proyectoResource.value();
    return proyecto ? estaVencido(proyecto.fechaFin, proyecto.estado) : false;
  });

  protected readonly progresoResource = httpResource<Progreso>(() => ({
    url: `/api/proyectos/${this.proyectoId()}/progreso`,
  }));

  protected readonly rendimientoResource = httpResource<Rendimiento>(() => ({
    url: `/api/proyectos/${this.proyectoId()}/rendimiento`,
  }));

  protected readonly tareasResource = httpResource<Tarea[]>(
    () => ({ url: '/api/tareas', params: { proyectoId: this.proyectoId() } }),
    { defaultValue: [] },
  );

  // Solo se pide si es administrador (único rol que puede listar usuarios, ver
  // @PreAuthorize en UsuarioController del back).
  protected readonly usuariosResource = httpResource<Usuario[]>(
    () => (this.auth.tieneRol('ADMINISTRADOR') ? { url: '/api/usuarios' } : undefined),
    { defaultValue: [] },
  );

  // ── Editar proyecto ──
  protected readonly showEditForm = signal(false);
  protected readonly savingProyecto = signal(false);
  protected readonly proyectoFormError = signal<string | null>(null);

  protected readonly proyectoForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
    fechaInicio: [''],
    fechaFin: [''],
  });

  abrirEditarProyecto(): void {
    const proyecto = this.proyectoResource.value();
    if (!proyecto) return;
    this.proyectoFormError.set(null);
    this.proyectoForm.reset({
      nombre: proyecto.nombre,
      descripcion: proyecto.descripcion ?? '',
      fechaInicio: proyecto.fechaInicio ?? '',
      fechaFin: proyecto.fechaFin ?? '',
    });
    this.showEditForm.set(true);
  }

  cerrarEditarProyecto(): void {
    this.showEditForm.set(false);
  }

  guardarProyecto(): void {
    if (this.proyectoForm.invalid) {
      this.proyectoForm.markAllAsTouched();
      return;
    }

    const payload: ProyectoInput = this.proyectoForm.getRawValue();
    this.savingProyecto.set(true);
    this.proyectoFormError.set(null);

    this.proyectoService.actualizar(this.proyectoId(), payload).subscribe({
      next: () => {
        this.savingProyecto.set(false);
        this.showEditForm.set(false);
        this.proyectoResource.reload();
      },
      error: (err) => {
        this.savingProyecto.set(false);
        this.proyectoFormError.set(extraerMensajeError(err, 'No se pudo guardar el proyecto.'));
      },
    });
  }

  // ── Tareas (crear / editar-reasignar: sólo ADMINISTRADOR, ver @PreAuthorize en TareaController) ──
  protected readonly showTareaForm = signal(false);
  protected readonly editingTarea = signal<Tarea | null>(null);
  protected readonly savingTarea = signal(false);
  protected readonly tareaFormError = signal<string | null>(null);

  protected readonly tareaForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
    fechaInicio: [''],
    fechaFin: [''],
    prioridad: ['MEDIA'],
    responsableId: [''],
  });

  abrirCrearTarea(): void {
    this.editingTarea.set(null);
    this.tareaFormError.set(null);
    this.tareaForm.reset({
      nombre: '',
      descripcion: '',
      fechaInicio: '',
      fechaFin: '',
      prioridad: 'MEDIA',
      responsableId: '',
    });
    this.showTareaForm.set(true);
  }

  abrirEditarTarea(tarea: Tarea): void {
    this.editingTarea.set(tarea);
    this.tareaFormError.set(null);
    this.tareaForm.reset({
      nombre: tarea.nombre,
      descripcion: tarea.descripcion ?? '',
      fechaInicio: tarea.fechaInicio ?? '',
      fechaFin: tarea.fechaFin ?? '',
      prioridad: tarea.prioridad ?? '',
      responsableId: tarea.responsable ? String(tarea.responsable.id) : '',
    });
    this.showTareaForm.set(true);
  }

  cerrarFormTarea(): void {
    this.showTareaForm.set(false);
  }

  guardarTarea(): void {
    if (this.tareaForm.invalid) {
      this.tareaForm.markAllAsTouched();
      return;
    }

    const { nombre, descripcion, fechaInicio, fechaFin, prioridad, responsableId } =
      this.tareaForm.getRawValue();

    const payload: TareaInput = {
      nombre,
      descripcion: descripcion || undefined,
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined,
      prioridad: (prioridad || undefined) as TareaInput['prioridad'],
      proyecto: { id: this.proyectoId() },
      responsable: responsableId ? { id: Number(responsableId) } : undefined,
    };

    this.savingTarea.set(true);
    this.tareaFormError.set(null);

    const editing = this.editingTarea();
    const request = editing
      ? this.tareaService.actualizar(editing.id, payload)
      : this.tareaService.crear(payload);

    request.subscribe({
      next: () => {
        this.savingTarea.set(false);
        this.showTareaForm.set(false);
        this.recargarSeguimiento();
      },
      error: (err) => {
        this.savingTarea.set(false);
        this.tareaFormError.set(extraerMensajeError(err, 'No se pudo guardar la tarea.'));
      },
    });
  }

  // Único punto de cambio de estado: dispara el registro de historial en el backend,
  // que es la base de seguimiento (progreso) y rendimiento (duración real vs. planificada).
  // Si la llamada falla se revierte el <select> a mano (ver CambioEstadoTarea).
  cambiarEstadoTarea({ tarea, estado, select }: CambioEstadoTarea): void {
    this.tareaService.cambiarEstado(tarea.id, estado).subscribe({
      next: () => this.recargarSeguimiento(),
      error: (err) => {
        select.value = tarea.estado;
        alert(extraerMensajeError(err, 'No se pudo cambiar el estado de la tarea.'));
      },
    });
  }

  eliminarTarea(tarea: Tarea): void {
    if (!confirm(`¿Eliminar la tarea "${tarea.nombre}"? También se borra su historial de estados.`)) {
      return;
    }

    this.tareaService.eliminar(tarea.id).subscribe({
      next: () => this.recargarSeguimiento(),
      error: (err) => alert(extraerMensajeError(err, 'No se pudo eliminar la tarea.')),
    });
  }

  private recargarSeguimiento(): void {
    this.tareasResource.reload();
    this.progresoResource.reload();
    this.rendimientoResource.reload();
    // El estado del proyecto puede haber cambiado como efecto automático del cambio de
    // estado de la tarea (ver ProyectoService.recalcularEstado en el back) — hay que
    // refrescar el proyecto para que el badge del header lo refleje.
    this.proyectoResource.reload();
  }
}
