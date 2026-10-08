import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Tarea } from '../../core/models/tarea.model';
import { Usuario, nombreCompleto } from '../../core/models/usuario.model';
import { AuthService } from '../../core/services/auth.service';
import { TareaService } from '../../core/services/tarea.service';
import { extraerMensajeError } from '../../core/utils/http-error';
import {
  CambioEstadoTarea,
  TareasKanbanComponent,
} from '../../shared/tareas-kanban/tareas-kanban.component';

// Historia #7: "la tarea asignada aparece en la lista de tareas del miembro correspondiente"
// (prototipo "User Tasks"). Cada usuario ve sus tareas de todos los proyectos; quien gestiona
// tareas (permiso tareas:editar) ve todas, con un filtro por responsable (prototipo "Admin Tasks").
@Component({
  selector: 'app-tareas',
  standalone: true,
  imports: [TareasKanbanComponent],
  templateUrl: './tareas.component.html',
  styleUrl: './tareas.component.css',
})
export class TareasComponent {
  private readonly tareaService = inject(TareaService);
  protected readonly auth = inject(AuthService);
  protected readonly nombreCompleto = nombreCompleto;

  protected readonly veTodas = computed(() => this.auth.puede('tareas', 'editar'));

  protected readonly tareasResource = httpResource<Tarea[]>(
    () => ({ url: this.veTodas() ? '/api/tareas' : '/api/tareas/mias' }),
    { defaultValue: [] },
  );

  // Para el filtro por responsable; requiere leer el módulo `usuarios` (ver UsuarioController del back).
  protected readonly usuariosResource = httpResource<Usuario[]>(
    () => (this.veTodas() && this.auth.puede('usuarios', 'leer') ? { url: '/api/usuarios' } : undefined),
    { defaultValue: [] },
  );

  protected readonly busqueda = signal('');
  // '' = todos, 'sin-asignar', o el id del responsable.
  protected readonly filtroResponsable = signal('');

  // Filtrado client-side: el listado ya viene completo en un solo pedido (sin Pageable en el back).
  protected readonly tareasFiltradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const responsable = this.filtroResponsable();
    return (this.tareasResource.value() ?? []).filter((t) => {
      const coincideTexto =
        !texto || t.nombre.toLowerCase().includes(texto) || t.proyecto.nombre.toLowerCase().includes(texto);
      const coincideResponsable =
        !responsable ||
        (responsable === 'sin-asignar' ? !t.responsable : String(t.responsable?.id) === responsable);
      return coincideTexto && coincideResponsable;
    });
  });

  cambiarEstadoTarea({ tarea, estado, select }: CambioEstadoTarea): void {
    this.tareaService.cambiarEstado(tarea.id, estado).subscribe({
      next: () => this.tareasResource.reload(),
      error: (err) => {
        select.value = tarea.estado;
        alert(extraerMensajeError(err, 'No se pudo cambiar el estado de la tarea.'));
      },
    });
  }
}
