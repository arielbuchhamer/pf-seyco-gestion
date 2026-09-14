import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { ESTADO_PROYECTO_LABEL, Progreso, Proyecto } from '../../core/models/proyecto.model';
import { estaVencido } from '../../core/utils/fecha';

// Una tarjeta por proyecto en el listado (en vez de fila de tabla). La cantidad de tareas no
// viene en GET /api/proyectos (es una lista liviana, sin agregados), así que cada tarjeta pide
// su propio progreso — se resuelve sola, sin que el listado tenga que saber nada de esto.
@Component({
  selector: 'app-proyecto-card',
  standalone: true,
  templateUrl: './proyecto-card.component.html',
  styleUrl: './proyecto-card.component.css',
})
export class ProyectoCardComponent {
  private readonly router = inject(Router);

  readonly proyecto = input.required<Proyecto>();
  readonly editar = output<void>();
  readonly eliminar = output<void>();

  protected readonly estadoLabel = ESTADO_PROYECTO_LABEL;

  protected readonly progresoResource = httpResource<Progreso>(() => ({
    url: `/api/proyectos/${this.proyecto().id}/progreso`,
  }));

  protected readonly vencido = computed(() =>
    estaVencido(this.proyecto().fechaFin, this.proyecto().estado),
  );

  abrirDetalle(): void {
    this.router.navigate(['/proyectos', this.proyecto().id]);
  }

  onEditar(event: Event): void {
    event.stopPropagation();
    this.editar.emit();
  }

  onEliminar(event: Event): void {
    event.stopPropagation();
    this.eliminar.emit();
  }
}
