import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PuedeDirective } from '../../core/directives/puede.directive';
import { Proyecto } from '../../core/models/proyecto.model';
import { FechasTarea, Tarea } from '../../core/models/tarea.model';
import { AuthService } from '../../core/services/auth.service';
import { ProyectoService } from '../../core/services/proyecto.service';
import { TareaService } from '../../core/services/tarea.service';
import { diasEntre, fecha, fechaCorta, hoy } from '../../core/utils/formato';
import { extraerMensajeError } from '../../core/utils/http-error';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';
import { DIAS_EN_RIESGO, SITUACION_LABEL, Situacion, situacion } from './situacion';
import { CabeceraComponent } from '../../shared/cabecera/cabecera.component';
import { TareasSituacionComponent } from './tareas-situacion.component';

type CampoFecha = Exclude<keyof FechasTarea, 'id' | 'avance'>;

interface FilaTarea {
  tarea: Tarea;
  subtarea: boolean;
  hijos: number;
  abierta: boolean;
  // Fechas con lo editado sin guardar; en una tarea con subtareas, el consolidado de ellas.
  fechas: FechasTarea;
  editada: boolean;
  desvio: number | null;
  situacion: Situacion | null;
}

// Pantalla Tareas: carga de fechas por proyecto (pantalla "Carga de Fechas" de la preview).
// Se elige el proyecto arriba (?proyecto=<id>) y se ve el árbol tarea › subtarea. Mientras el
// proyecto está en planificación se cargan las fechas plan; al fijar la línea base quedan
// congeladas y se cargan el inicio real, el fin estimado/real y el % de avance, con el desvío
// contra la base (el avance alimenta la curva S y los indicadores del proyecto).
// Las fechas se cargan en las subtareas; la tarea que las agrupa muestra el consolidado (igual
// que el backend). Sin permiso tareas:editar, la grilla es de sólo lectura.
// Con embebido = true es la solapa "Carga de fechas" de la vista del proyecto: sin ruta, título
// ni selector de proyecto, y avisa con (cambio) cada vez que guarda, para que el proyecto recargue.
// (El cambio de estado de las tareas queda para más adelante.)
@Component({
  selector: 'app-tareas',
  standalone: true,
  imports: [RouterLink, PuedeDirective, TareasSituacionComponent, CabeceraComponent],
  templateUrl: './tareas.component.html',
  styleUrl: './tareas.component.css',
})
export class TareasComponent {
  private readonly tareaService = inject(TareaService);
  private readonly proyectoService = inject(ProyectoService);
  private readonly snackbar = inject(SnackbarService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Query param ?proyecto=<id> (withComponentInputBinding).
  readonly proyecto = input<string>();
  readonly embebido = input(false);
  readonly cambio = output<void>();

  protected readonly fecha = fecha;
  protected readonly fechaCorta = fechaCorta;
  protected readonly situacionLabel = SITUACION_LABEL;
  protected readonly hoy = hoy();
  protected readonly DIAS_EN_RIESGO = DIAS_EN_RIESGO;

  protected readonly puedeEditar = computed(() => this.auth.puede('tareas', 'editar'));

  // Los más recientes primero; sin ?proyecto= se abre el primero.
  protected readonly proyectosResource = httpResource<Proyecto[]>(() => (this.embebido() ? undefined : '/api/proyectos'), {
    defaultValue: [],
  });
  protected readonly proyectos = computed(() => [...this.proyectosResource.value()].sort((a, b) => b.id - a.id));
  protected readonly proyectoId = computed(() => Number(this.proyecto()) || this.proyectos()[0]?.id || null);

  protected readonly proyectoResource = httpResource<Proyecto>(() => {
    const id = this.proyectoId();
    return id ? `/api/proyectos/${id}` : undefined;
  });
  protected readonly tareasResource = httpResource<Tarea[]>(
    () => {
      const id = this.proyectoId();
      return id ? { url: '/api/tareas', params: { proyectoId: id } } : undefined;
    },
    { defaultValue: [] },
  );

  protected readonly lineaBase = computed(() => this.proyectoResource.value()?.lineaBaseFecha ?? null);

  elegirProyecto(id: string): void {
    this.borradores.set(new Map());
    this.cerradas.set(new Set());
    this.router.navigate([], { queryParams: { proyecto: id }, replaceUrl: true });
  }

  protected readonly cerradas = signal<Set<number>>(new Set());

  private readonly hijosPorPadre = computed(() => {
    const mapa = new Map<number, Tarea[]>();
    for (const t of this.tareasResource.value()) {
      if (t.padreId != null) mapa.set(t.padreId, [...(mapa.get(t.padreId) ?? []), t]);
    }
    mapa.forEach((hijas) => hijas.sort(ordenar));
    return mapa;
  });

  // ── Carga de fechas ──
  // Fechas editadas y todavía sin guardar, por id de tarea (sólo tareas sin subtareas).
  protected readonly borradores = signal<Map<number, FechasTarea>>(new Map());
  protected readonly guardandoFechas = signal(false);

  private fechasDe(tarea: Tarea): FechasTarea {
    return this.borradores().get(tarea.id) ?? fechasGuardadas(tarea);
  }

  // Tareas sin subtareas: donde se cargan las fechas y lo que cuenta en la barra de situación.
  private readonly hojas = computed(() => this.tareasResource.value().filter((t) => !this.hijosPorPadre().has(t.id)));

  protected readonly filas = computed<FilaTarea[]>(() => {
    const hijos = this.hijosPorPadre();
    const cerradas = this.cerradas();
    const borradores = this.borradores();
    const conBase = this.lineaBase() != null;
    const fila = (tarea: Tarea, subtarea: boolean, subtareas: Tarea[]): FilaTarea => {
      const fechas = subtareas.length ? consolidar(tarea.id, subtareas.map((s) => this.fechasDe(s))) : this.fechasDe(tarea);
      const desvio = conBase && fechas.fechaFin && fechas.fechaFinReal ? diasEntre(fechas.fechaFin, fechas.fechaFinReal) : null;
      return {
        tarea,
        subtarea,
        hijos: subtareas.length,
        abierta: !cerradas.has(tarea.id),
        fechas,
        editada: borradores.has(tarea.id) || subtareas.some((s) => borradores.has(s.id)),
        desvio,
        situacion: conBase ? situacion(desvio) : null,
      };
    };
    const filas: FilaTarea[] = [];
    const raices = this.tareasResource.value().filter((t) => t.padreId == null).sort(ordenar);
    for (const tarea of raices) {
      const subtareas = hijos.get(tarea.id) ?? [];
      const padre = fila(tarea, false, subtareas);
      filas.push(padre);
      if (padre.abierta) subtareas.forEach((sub) => filas.push(fila(sub, true, [])));
    }
    return filas;
  });

  // Tareas sin subtareas a las que les falta inicio o fin plan: sin eso no se fija la línea base.
  protected readonly sinFechasPlan = computed(
    () =>
      this.hojas().filter((t) => {
        const f = this.fechasDe(t);
        return !f.fechaInicio || !f.fechaFin;
      }).length,
  );

  // Cuántas subtareas hay en cada situación (barra de arriba a la derecha). Sólo en seguimiento:
  // sin línea base no hay contra qué medir el desvío.
  protected readonly porSituacion = computed<Record<Situacion, number> | null>(() => {
    if (this.lineaBase() == null) return null;
    const porSituacion: Record<Situacion, number> = { 'sin-datos': 0, 'en-fecha': 0, 'en-riesgo': 0, desviado: 0 };
    for (const t of this.hojas()) {
      const f = this.fechasDe(t);
      porSituacion[situacion(f.fechaFin && f.fechaFinReal ? diasEntre(f.fechaFin, f.fechaFinReal) : null)]++;
    }
    return porSituacion;
  });

  editarFecha(tarea: Tarea, campo: CampoFecha, valor: string): void {
    this.editar(tarea, { [campo]: valor || null });
  }

  editarAvance(tarea: Tarea, valor: string): void {
    this.editar(tarea, { avance: valor === '' ? null : Math.max(0, Math.min(100, Math.round(Number(valor)))) });
  }

  private editar(tarea: Tarea, cambio: Partial<FechasTarea>): void {
    const original = fechasGuardadas(tarea);
    const editada = { ...this.fechasDe(tarea), ...cambio };
    this.borradores.update((actual) => {
      const nuevo = new Map(actual);
      const igual = (Object.keys(original) as (keyof FechasTarea)[]).every((k) => original[k] === editada[k]);
      if (igual) nuevo.delete(tarea.id);
      else nuevo.set(tarea.id, editada);
      return nuevo;
    });
  }

  descartarFechas(): void {
    this.borradores.set(new Map());
  }

  guardarFechas(): void {
    const id = this.proyectoId();
    if (!id) return;
    this.guardandoFechas.set(true);
    this.tareaService.guardarFechas(id, [...this.borradores().values()]).subscribe({
      next: () => {
        this.guardandoFechas.set(false);
        this.borradores.set(new Map());
        this.snackbar.mostrar('Fechas guardadas.');
        this.tareasResource.reload();
        this.cambio.emit();
      },
      error: (err) => {
        this.guardandoFechas.set(false);
        this.snackbar.mostrar(extraerMensajeError(err, 'No se pudieron guardar las fechas.'), 'error');
      },
    });
  }

  protected readonly confirmandoLineaBase = signal(false);
  protected readonly fijandoLineaBase = signal(false);

  fijarLineaBase(): void {
    const id = this.proyectoId();
    if (!id) return;
    this.fijandoLineaBase.set(true);
    this.proyectoService.fijarLineaBase(id).subscribe({
      next: () => {
        this.fijandoLineaBase.set(false);
        this.confirmandoLineaBase.set(false);
        this.snackbar.mostrar('Línea base fijada. Ya se pueden cargar las fechas reales.');
        this.proyectoResource.reload();
        this.cambio.emit();
      },
      error: (err) => {
        this.fijandoLineaBase.set(false);
        this.confirmandoLineaBase.set(false);
        this.snackbar.mostrar(extraerMensajeError(err, 'No se pudo fijar la línea base.'), 'error');
      },
    });
  }

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
    this.cerradas.set(new Set(this.hijosPorPadre().keys()));
  }
}

function fechasGuardadas(tarea: Tarea): FechasTarea {
  return {
    id: tarea.id,
    fechaInicio: tarea.fechaInicio,
    fechaFin: tarea.fechaFin,
    fechaInicioReal: tarea.fechaInicioReal,
    fechaFinReal: tarea.fechaFinReal,
    avance: tarea.avance,
  };
}

// Fechas ISO: comparar strings alcanza.
function menor(a: string | null, b: string | null): string | null {
  return a == null ? b : b == null || a <= b ? a : b;
}

function mayor(a: string | null, b: string | null): string | null {
  return a == null ? b : b == null || a >= b ? a : b;
}

// Consolidado de una tarea a partir de sus subtareas (mismo criterio que TareaService del back):
// plan e inicio real de punta a punta; fin estimado/real el de la última en terminar, con el plan
// de las que no tienen estimación, o vacío si ninguna la tiene. Avance: el promedio de las subtareas.
function consolidar(id: number, subtareas: FechasTarea[]): FechasTarea {
  const hayFinReal = subtareas.some((s) => s.fechaFinReal);
  return {
    id,
    fechaInicio: subtareas.reduce<string | null>((acc, s) => menor(acc, s.fechaInicio), null),
    fechaFin: subtareas.reduce<string | null>((acc, s) => mayor(acc, s.fechaFin), null),
    fechaInicioReal: subtareas.reduce<string | null>((acc, s) => menor(acc, s.fechaInicioReal), null),
    fechaFinReal: hayFinReal ? subtareas.reduce<string | null>((acc, s) => mayor(acc, s.fechaFinReal ?? s.fechaFin), null) : null,
    avance: subtareas.some((s) => s.avance != null)
      ? Math.round(subtareas.reduce((acc, s) => acc + (s.avance ?? 0), 0) / subtareas.length)
      : null,
  };
}

// Orden del Excel (orden entre hermanas); las tareas cargadas a mano van al final, por id.
function ordenar(a: Tarea, b: Tarea): number {
  return (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER) || a.id - b.id;
}
