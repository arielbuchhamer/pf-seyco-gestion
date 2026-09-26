import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TieneRolDirective } from '../../core/directives/tiene-rol.directive';
import {
  ESTADOS_TAREA,
  ESTADO_TAREA_LABEL,
  EstadoTarea,
  Tarea,
} from '../../core/models/tarea.model';
import { nombreCompleto } from '../../core/models/usuario.model';
import { AuthService } from '../../core/services/auth.service';
import { AvatarComponent } from '../avatar/avatar.component';

export interface CambioEstadoTarea {
  tarea: Tarea;
  estado: EstadoTarea;
  // El <select> nativo, para que el padre pueda revertirlo si la llamada falla: el browser ya
  // cambió su valor visualmente, y como no hay [value] atado reactivamente Angular no lo corrige solo.
  select: HTMLSelectElement;
}

// Tablero de tareas por estado, compartido entre el detalle de proyecto y la pantalla "Tareas".
// Sólo muestra y emite: las llamadas al back (y recargar después) quedan en cada página.
@Component({
  selector: 'app-tareas-kanban',
  standalone: true,
  imports: [RouterLink, TieneRolDirective, AvatarComponent],
  templateUrl: './tareas-kanban.component.html',
  styleUrl: './tareas-kanban.component.css',
})
export class TareasKanbanComponent {
  private readonly auth = inject(AuthService);

  readonly tareas = input.required<Tarea[]>();
  // En la pantalla "Tareas" (multi-proyecto) cada tarjeta indica y linkea a su proyecto.
  readonly mostrarProyecto = input(false);
  // Botones de editar/eliminar (además, sólo para ADMINISTRADOR): sólo donde la página maneja esas acciones.
  readonly conAcciones = input(false);

  readonly cambiarEstado = output<CambioEstadoTarea>();
  readonly editar = output<Tarea>();
  readonly eliminar = output<Tarea>();

  protected readonly estadosTarea = ESTADOS_TAREA;
  protected readonly estadoTareaLabel = ESTADO_TAREA_LABEL;
  protected readonly nombreCompleto = nombreCompleto;

  // Paginación independiente por columna (Pendiente/En progreso/Completada): con muchas
  // tareas, cada columna escala sola sin volverse un scroll infinito y sin que el tamaño
  // de una tape a las demás (a diferencia del prototipo, que usa un único paginador).
  private static readonly TAREAS_POR_PAGINA = 5;
  private readonly paginaPorEstado = signal<Record<EstadoTarea, number>>({
    PENDIENTE: 1,
    EN_PROGRESO: 1,
    COMPLETADA: 1,
  });

  protected readonly columnas = computed(() => {
    const tareas = this.tareas();
    const paginas = this.paginaPorEstado();
    const tam = TareasKanbanComponent.TAREAS_POR_PAGINA;
    return Object.fromEntries(
      this.estadosTarea.map((estado) => {
        const todas = tareas.filter((t) => t.estado === estado);
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

  // Mismo criterio que TareaService.cambiarEstado en el back: el administrador cambia
  // cualquier tarea, el resto sólo las que tiene asignadas.
  puedeCambiarEstado(tarea: Tarea): boolean {
    return this.auth.tieneRol('ADMINISTRADOR') || tarea.responsable?.id === this.auth.currentUser()?.id;
  }

  onCambiarEstado(tarea: Tarea, select: HTMLSelectElement): void {
    const estado = select.value as EstadoTarea;
    if (estado === tarea.estado) return;
    this.cambiarEstado.emit({ tarea, estado, select });
  }
}
