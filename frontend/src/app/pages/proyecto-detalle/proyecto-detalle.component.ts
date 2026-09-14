import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
import {
  ESTADOS_TAREA,
  ESTADO_TAREA_LABEL,
  EstadoTarea,
  Tarea,
  TareaInput,
} from '../../core/models/tarea.model';
import { TareaService } from '../../core/services/tarea.service';

@Component({
  selector: 'app-proyecto-detalle',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
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
  // SecurityConfig.requestMatchers("/api/usuarios/**").hasRole("ADMINISTRADOR") en el back).
  protected readonly usuariosResource = httpResource<Usuario[]>(
    () => (this.auth.currentUser()?.rol === 'ADMINISTRADOR' ? { url: '/api/usuarios' } : undefined),
    { defaultValue: [] },
  );

  protected readonly tareasPorEstado = computed(() => {
    const tareas = this.tareasResource.value() ?? [];
    return Object.fromEntries(
      this.estadosTarea.map((estado) => [estado, tareas.filter((t) => t.estado === estado)]),
    ) as Record<EstadoTarea, Tarea[]>;
  });

  // Paginación independiente por columna del kanban (Pendiente/En progreso/Completada):
  // con muchas tareas, cada columna escala sola sin volverse un scroll infinito y sin que
  // el tamaño de una tape a las demás (a diferencia del prototipo, que usa un único
  // paginador para las 3 columnas juntas).
  private static readonly TAREAS_POR_PAGINA = 5;
  protected readonly paginaPorEstado = signal<Record<EstadoTarea, number>>({
    PENDIENTE: 1,
    EN_PROGRESO: 1,
    COMPLETADA: 1,
  });

  protected readonly columnasTareas = computed(() => {
    const porEstado = this.tareasPorEstado();
    const paginas = this.paginaPorEstado();
    const tam = ProyectoDetalleComponent.TAREAS_POR_PAGINA;
    return Object.fromEntries(
      this.estadosTarea.map((estado) => {
        const todas = porEstado[estado];
        const totalPaginas = Math.max(1, Math.ceil(todas.length / tam));
        const pagina = Math.min(paginas[estado], totalPaginas);
        const inicio = (pagina - 1) * tam;
        return [estado, { items: todas.slice(inicio, inicio + tam), pagina, totalPaginas, total: todas.length }];
      }),
    ) as Record<EstadoTarea, { items: Tarea[]; pagina: number; totalPaginas: number; total: number }>;
  });

  cambiarPagina(estado: EstadoTarea, delta: number): void {
    this.paginaPorEstado.update((actual) => ({ ...actual, [estado]: actual[estado] + delta }));
  }

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

  // ── Tareas ──
  protected readonly showTareaForm = signal(false);
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

  cerrarCrearTarea(): void {
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

    this.tareaService.crear(payload).subscribe({
      next: () => {
        this.savingTarea.set(false);
        this.showTareaForm.set(false);
        this.recargarSeguimiento();
      },
      error: (err) => {
        this.savingTarea.set(false);
        this.tareaFormError.set(extraerMensajeError(err, 'No se pudo crear la tarea.'));
      },
    });
  }

  // Único punto de cambio de estado: dispara el registro de historial en el backend,
  // que es la base de seguimiento (progreso) y rendimiento (duración real vs. planificada).
  // Recibe el <select> nativo para poder revertirlo a mano si la llamada falla: el browser ya
  // cambió su valor visualmente apenas el usuario elige una opción, y como no hay [value] atado
  // reactivamente (ver el fix del bug de "Pendiente" fijo), Angular no lo corrige solo.
  cambiarEstadoTarea(tarea: Tarea, estado: EstadoTarea, selectEl: HTMLSelectElement): void {
    if (estado === tarea.estado) return;
    const estadoOriginal = tarea.estado;
    this.tareaService.cambiarEstado(tarea.id, estado).subscribe({
      next: () => this.recargarSeguimiento(),
      error: (err) => {
        selectEl.value = estadoOriginal;
        alert(extraerMensajeError(err, 'No se pudo cambiar el estado de la tarea.'));
      },
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
