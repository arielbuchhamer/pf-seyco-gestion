import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PuedeDirective } from '../../core/directives/puede.directive';
import { NodoPresupuesto, PresupuestoDetalle } from '../../core/models/presupuesto.model';
import { Tarea, TareaInput } from '../../core/models/tarea.model';
import { Usuario, nombreCompleto } from '../../core/models/usuario.model';
import { AuthService } from '../../core/services/auth.service';
import { TareaService } from '../../core/services/tarea.service';
import { fechaCorta, pesos } from '../../core/utils/formato';
import { extraerMensajeError } from '../../core/utils/http-error';

interface FilaTarea {
  tarea: Tarea;
  subtarea: boolean;
  hijos: number;
  completadas: number;
  abierta: boolean;
  monto: number | null;
}

// Solapa Tareas: el árbol tarea › subtarea. El avance de una tarea es cuántas de sus subtareas están
// completadas. (El estado de las tareas se cambia desde la pantalla Tareas.) Las tareas vienen del
// Excel, pero se puede agregar una tarea principal o una subtarea de una existente.
@Component({
  selector: 'app-proyecto-tareas',
  standalone: true,
  imports: [ReactiveFormsModule, PuedeDirective],
  templateUrl: './proyecto-tareas.component.html',
  styleUrl: './proyecto-tareas.component.css',
})
export class ProyectoTareasComponent {
  private readonly tareaService = inject(TareaService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly proyectoId = input.required<number>();
  readonly tareas = input.required<Tarea[]>();
  readonly presupuesto = input<PresupuestoDetalle | null>(null);
  // Número de capítulo/grupo a abrir en la solapa Presupuesto (clic en el monto).
  readonly verPresupuesto = output<string[]>();
  readonly cambio = output<void>();

  protected readonly pesos = pesos;
  protected readonly fechaCorta = fechaCorta;
  protected readonly nombreCompleto = nombreCompleto;

  protected readonly cerradas = signal<Set<number>>(new Set());

  private readonly hijosPorPadre = computed(() => {
    const mapa = new Map<number, Tarea[]>();
    for (const t of this.tareas()) {
      if (t.padreId != null) mapa.set(t.padreId, [...(mapa.get(t.padreId) ?? []), t]);
    }
    mapa.forEach((hijas) => hijas.sort(ordenar));
    return mapa;
  });

  // Nodo del presupuesto de cada tarea (capítulo o grupo) y el camino de números para abrirlo.
  private readonly presupuestoPorTarea = computed(() => {
    const mapa = new Map<number, { total: number; camino: string[] }>();
    const recorrer = (nodo: NodoPresupuesto, camino: string[]): void => {
      const propio = [...camino, nodo.numero];
      if (nodo.tareaId != null) mapa.set(nodo.tareaId, { total: nodo.total, camino: propio });
      nodo.hijos.forEach((h) => recorrer(h, propio));
    };
    this.presupuesto()?.items.forEach((n) => recorrer(n, []));
    return mapa;
  });

  protected readonly filas = computed<FilaTarea[]>(() => {
    const hijos = this.hijosPorPadre();
    const cerradas = this.cerradas();
    const montos = this.presupuestoPorTarea();
    const filas: FilaTarea[] = [];
    const raices = this.tareas().filter((t) => t.padreId == null).sort(ordenar);
    for (const tarea of raices) {
      const subtareas = hijos.get(tarea.id) ?? [];
      const abierta = !cerradas.has(tarea.id);
      filas.push({
        tarea,
        subtarea: false,
        hijos: subtareas.length,
        completadas: subtareas.filter((s) => s.estado === 'COMPLETADA').length,
        abierta,
        monto: montos.get(tarea.id)?.total ?? null,
      });
      if (abierta) {
        for (const sub of subtareas) {
          filas.push({ tarea: sub, subtarea: true, hijos: 0, completadas: 0, abierta: false, monto: montos.get(sub.id)?.total ?? null });
        }
      }
    }
    return filas;
  });

  alternar(tareaId: number): void {
    this.cerradas.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(tareaId)) nuevo.delete(tareaId);
      else nuevo.add(tareaId);
      return nuevo;
    });
  }

  expandirTodo(): void {
    this.cerradas.set(new Set());
  }

  contraerTodo(): void {
    this.cerradas.set(new Set(this.tareas().filter((t) => this.hijosPorPadre().has(t.id)).map((t) => t.id)));
  }

  irAlPresupuesto(tareaId: number): void {
    const nodo = this.presupuestoPorTarea().get(tareaId);
    if (nodo) this.verPresupuesto.emit(nodo.camino);
  }

  // ── Nueva tarea (a mano, de primer nivel) ──
  protected readonly usuariosResource = httpResource<Usuario[]>(
    () => (this.auth.puede('usuarios', 'leer') ? '/api/usuarios' : undefined),
    { defaultValue: [] },
  );
  protected readonly mostrarForm = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorForm = signal<string | null>(null);
  // Tareas principales: opciones de "¿Dónde va?" (subtarea de cuál).
  protected readonly principales = computed(() => this.tareas().filter((t) => t.padreId == null).sort(ordenar));

  protected readonly form = this.fb.nonNullable.group({
    padreId: [''],
    nombre: ['', [Validators.required]],
    descripcion: [''],
    fechaInicio: [''],
    fechaFin: [''],
    prioridad: ['MEDIA'],
    responsableId: [''],
  });

  abrirNuevaTarea(padreId: number | null = null): void {
    this.form.reset({ padreId: padreId ? String(padreId) : '', nombre: '', descripcion: '', fechaInicio: '', fechaFin: '', prioridad: 'MEDIA', responsableId: '' });
    this.errorForm.set(null);
    this.mostrarForm.set(true);
  }

  guardarTarea(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { padreId, nombre, descripcion, fechaInicio, fechaFin, prioridad, responsableId } = this.form.getRawValue();
    const payload: TareaInput = {
      nombre,
      descripcion: descripcion || undefined,
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined,
      prioridad: (prioridad || undefined) as TareaInput['prioridad'],
      proyecto: { id: this.proyectoId() },
      responsable: responsableId ? { id: Number(responsableId) } : undefined,
    };
    this.guardando.set(true);
    this.errorForm.set(null);
    this.tareaService.crear(payload, padreId ? Number(padreId) : null).subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarForm.set(false);
        this.cambio.emit();
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorForm.set(extraerMensajeError(err, 'No se pudo crear la tarea.'));
      },
    });
  }
}

// Orden del Excel (orden entre hermanas); las tareas cargadas a mano van al final, por id.
function ordenar(a: Tarea, b: Tarea): number {
  return (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER) || a.id - b.id;
}
