import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { extraerMensajeError } from '../../core/utils/http-error';
import { EstadoProyecto, Proyecto, ProyectoInput } from '../../core/models/proyecto.model';
import { ProyectoService } from '../../core/services/proyecto.service';
import { ProyectoCardComponent } from './proyecto-card.component';

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [ReactiveFormsModule, ProyectoCardComponent],
  templateUrl: './proyectos.component.html',
  styleUrl: './proyectos.component.css',
})
export class ProyectosComponent {
  private readonly proyectoService = inject(ProyectoService);
  private readonly fb = inject(FormBuilder);

  protected readonly filtroNombre = signal('');
  protected readonly filtroEstado = signal<EstadoProyecto | ''>('');

  // Listado reactivo (CUU_26/CUU_27): se vuelve a pedir solo al backend cada vez que
  // cambia algún filtro, sin manejar loading/error a mano (httpResource ya los expone).
  protected readonly proyectosResource = httpResource<Proyecto[]>(
    () => ({
      url: '/api/proyectos',
      params: {
        ...(this.filtroNombre() ? { nombre: this.filtroNombre() } : {}),
        ...(this.filtroEstado() ? { estado: this.filtroEstado() } : {}),
      },
    }),
    { defaultValue: [] },
  );

  // Paginación client-side: el listado ya trae todos los proyectos que matchean el filtro
  // en un solo pedido (no hay Pageable en el back), así que acá sólo se recorta la porción
  // visible — evita el mismo "scroll infinito" que se resolvió para el kanban de tareas.
  private static readonly PROYECTOS_POR_PAGINA = 9;
  protected readonly pagina = signal(1);

  protected readonly proyectosPaginados = computed(() => {
    const todos = this.proyectosResource.value() ?? [];
    const tam = ProyectosComponent.PROYECTOS_POR_PAGINA;
    const totalPaginas = Math.max(1, Math.ceil(todos.length / tam));
    const pagina = Math.min(this.pagina(), totalPaginas);
    const inicio = (pagina - 1) * tam;
    return { items: todos.slice(inicio, inicio + tam), pagina, totalPaginas };
  });

  cambiarPagina(delta: number): void {
    this.pagina.update((actual) => actual + delta);
  }

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly showForm = signal(false);
  protected readonly editingProyecto = signal<Proyecto | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
    fechaInicio: [''],
    fechaFin: [''],
  });

  onEstadoChange(event: Event): void {
    this.filtroEstado.set((event.target as HTMLSelectElement).value as EstadoProyecto | '');
    this.pagina.set(1);
  }

  onNombreChange(valor: string): void {
    this.filtroNombre.set(valor);
    this.pagina.set(1);
  }

  abrirCrear(): void {
    this.editingProyecto.set(null);
    this.formError.set(null);
    this.form.reset({ nombre: '', descripcion: '', fechaInicio: '', fechaFin: '' });
    this.showForm.set(true);
  }

  abrirEditar(proyecto: Proyecto): void {
    this.editingProyecto.set(proyecto);
    this.formError.set(null);
    this.form.reset({
      nombre: proyecto.nombre,
      descripcion: proyecto.descripcion ?? '',
      fechaInicio: proyecto.fechaInicio ?? '',
      fechaFin: proyecto.fechaFin ?? '',
    });
    this.showForm.set(true);
  }

  cerrarForm(): void {
    this.showForm.set(false);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: ProyectoInput = this.form.getRawValue();
    const editing = this.editingProyecto();

    this.saving.set(true);
    this.formError.set(null);

    const request = editing
      ? this.proyectoService.actualizar(editing.id, payload)
      : this.proyectoService.crear(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.proyectosResource.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(extraerMensajeError(err, 'No se pudo guardar el proyecto. Revisá los datos.'));
      },
    });
  }

  eliminar(proyecto: Proyecto): void {
    if (!confirm(`¿Eliminar el proyecto "${proyecto.nombre}"?`)) {
      return;
    }

    this.proyectoService.eliminar(proyecto.id).subscribe({
      next: () => this.proyectosResource.reload(),
      error: (err) => alert(extraerMensajeError(err, 'No se pudo eliminar el proyecto.')),
    });
  }
}
