import { httpResource } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { extraerMensajeError } from '../../core/utils/http-error';
import {
  ESTADO_PROYECTO_LABEL,
  EstadoProyecto,
  Proyecto,
  ProyectoInput,
} from '../../core/models/proyecto.model';
import { ProyectoService } from '../../core/services/proyecto.service';

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './proyectos.component.html',
})
export class ProyectosComponent {
  private readonly proyectoService = inject(ProyectoService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly estadoLabel = ESTADO_PROYECTO_LABEL;

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
  }

  abrirCrear(): void {
    this.editingProyecto.set(null);
    this.formError.set(null);
    this.form.reset({ nombre: '', descripcion: '', fechaInicio: '', fechaFin: '' });
    this.showForm.set(true);
  }

  abrirEditar(proyecto: Proyecto, event: Event): void {
    event.stopPropagation();
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

  eliminar(proyecto: Proyecto, event: Event): void {
    event.stopPropagation();
    if (!confirm(`¿Eliminar el proyecto "${proyecto.nombre}"?`)) {
      return;
    }

    this.proyectoService.eliminar(proyecto.id).subscribe({
      next: () => this.proyectosResource.reload(),
      error: (err) => alert(extraerMensajeError(err, 'No se pudo eliminar el proyecto.')),
    });
  }

  abrirDetalle(proyecto: Proyecto): void {
    this.router.navigate(['/proyectos', proyecto.id]);
  }
}
