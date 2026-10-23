import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PuedeDirective } from '../../core/directives/puede.directive';
import { Previsualizacion } from '../../core/models/presupuesto.model';
import {
  ESTADOS_PROYECTO,
  ESTADO_PROYECTO_LABEL,
  EstadoProyecto,
  Proyecto,
  TIPOS_CLIENTE,
  TIPOS_OBRA,
  TIPO_CLIENTE_LABEL,
  TIPO_OBRA_LABEL,
  TipoCliente,
  TipoObra,
} from '../../core/models/proyecto.model';
import { AuthService } from '../../core/services/auth.service';
import { ImportacionService } from '../../core/services/importacion.service';
import { hoy, pesos, sumarDias } from '../../core/utils/formato';
import { extraerMensajeError } from '../../core/utils/http-error';
import { alternar } from '../../core/utils/seguimiento';
import { CabeceraComponent } from '../../shared/cabecera/cabecera.component';
import { FiltroFechasComponent } from '../../shared/filtros/filtro-fechas.component';
import { PanelFiltrosComponent } from '../../shared/filtros/panel-filtros.component';
import { DistribucionRubrosComponent } from '../../shared/presupuesto/distribucion-rubros.component';
import { PresupuestoTablaComponent } from '../../shared/presupuesto/presupuesto-tabla.component';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';
import { ListadoProyectosComponent, OPCIONES_ORDEN, Orden } from './listado-proyectos.component';
import { ResumenImportacionComponent } from './resumen-importacion.component';
import { ZonaCargaComponent } from './zona-carga.component';

// Pantalla Proyectos: a la izquierda, chica, la importación del Excel de presupuesto (el único
// alta de proyectos); a la derecha, grande, el listado de proyectos con orden y los filtros de la
// cabecera. Al elegir el Excel se lee y se muestran los datos detectados; el proyecto se crea
// sólo desde la revisión (previsualización editable + confirmar), así siempre se chequean.
@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [
    RouterLink,
    PuedeDirective,
    CabeceraComponent,
    FiltroFechasComponent,
    PanelFiltrosComponent,
    ZonaCargaComponent,
    ListadoProyectosComponent,
    ResumenImportacionComponent,
    DistribucionRubrosComponent,
    PresupuestoTablaComponent,
  ],
  templateUrl: './proyectos.component.html',
  styleUrl: './proyectos.component.css',
})
export class ProyectosComponent {
  private readonly importacion = inject(ImportacionService);
  private readonly snackbar = inject(SnackbarService);
  private readonly auth = inject(AuthService);

  private readonly listado = viewChild(ListadoProyectosComponent);

  protected readonly pesos = pesos;
  protected readonly puedeImportar = computed(() => this.auth.puede('proyectos', 'escribir'));

  // ── Filtros y orden del listado (cabecera) ──
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly busqueda = signal('');
  protected readonly estados = signal<EstadoProyecto[]>([]);
  protected readonly clientes = signal<TipoCliente[]>([]);
  protected readonly orden = signal<Orden>({ campo: 'recientes', asc: false });
  protected readonly opcionesOrden = OPCIONES_ORDEN;
  protected readonly todosEstados = ESTADOS_PROYECTO;
  protected readonly estadoLabel = ESTADO_PROYECTO_LABEL;
  protected readonly alternar = alternar;
  protected readonly cantidadFiltros = computed(
    () => (this.busqueda().trim() ? 1 : 0) + this.estados().length + this.clientes().length,
  );

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.estados.set([]);
    this.clientes.set([]);
  }

  ordenarPor(campo: string): void {
    const opcion = OPCIONES_ORDEN.find((o) => o.campo === campo);
    if (opcion) this.orden.set({ campo: opcion.campo, asc: opcion.asc });
  }

  // ── Importación ──
  protected readonly archivo = signal<File | null>(null);
  // Lo que se leyó del Excel al elegirlo (datos detectados); al tocar "Revisar" pasa a previsualizacion.
  protected readonly lectura = signal<Previsualizacion | null>(null);
  protected readonly leyendo = signal(false);
  protected readonly previsualizacion = signal<Previsualizacion | null>(null);
  protected readonly errorLectura = signal<string | null>(null);

  // "Datos del proyecto" de la revisión: precargados desde el encabezado del Excel, editables.
  protected readonly nombre = signal('');
  protected readonly cliente = signal('');
  protected readonly refCliente = signal('');
  protected readonly atencion = signal('');
  protected readonly descripcion = signal('');
  protected readonly fechaInicio = signal('');
  protected readonly fechaFin = signal('');
  // Clasificación para el portafolio (no viene en el Excel).
  protected readonly tipoCliente = signal<TipoCliente | ''>('');
  protected readonly tipoObra = signal<TipoObra | ''>('');
  protected readonly tiposCliente = TIPOS_CLIENTE;
  protected readonly tiposObra = TIPOS_OBRA;
  protected readonly tipoClienteLabel = TIPO_CLIENTE_LABEL;
  protected readonly tipoObraLabel = TIPO_OBRA_LABEL;

  protected readonly creando = signal(false);
  protected readonly errorCrear = signal<string | null>(null);
  protected readonly creado = signal<Proyecto | null>(null);
  // Último proyecto creado en esta pantalla: se marca "Nuevo" en la lista aunque después se
  // toque "Importar otro" (que limpia `creado`).
  protected readonly ultimoCreadoId = signal<number | null>(null);
  protected readonly resumenCreado = signal<{ tareas: number; subtareas: number; items: number } | null>(null);

  protected readonly plazo = computed(() => this.previsualizacion()?.encabezado.plazoDias ?? null);

  // Elegir el archivo ya lo lee: así se ven los datos detectados antes de revisar.
  elegir(archivo: File): void {
    this.archivo.set(archivo);
    this.lectura.set(null);
    this.errorLectura.set(null);
    this.creado.set(null);
    this.leyendo.set(true);
    this.importacion.previsualizar(archivo).subscribe({
      next: (datos) => {
        this.leyendo.set(false);
        this.lectura.set(datos);
      },
      error: (err) => {
        this.leyendo.set(false);
        this.errorLectura.set(extraerMensajeError(err, 'No se pudo leer el archivo.'));
      },
    });
  }

  quitarArchivo(): void {
    this.archivo.set(null);
    this.lectura.set(null);
    this.errorLectura.set(null);
  }

  revisar(): void {
    const datos = this.lectura();
    if (!datos) return;
    this.previsualizacion.set(datos);
    const e = datos.encabezado;
    this.nombre.set(e.obra ?? '');
    this.cliente.set(e.cliente ?? '');
    this.refCliente.set(e.refCliente ?? '');
    this.atencion.set(e.atencion ?? '');
    this.descripcion.set('');
    this.tipoCliente.set('');
    this.tipoObra.set('');
    this.errorCrear.set(null);
    this.fechaFin.set('');
    this.cambiarInicio(hoy());
    window.scrollTo({ top: 0 });
  }

  private resumen(datos: Previsualizacion): { tareas: number; subtareas: number; items: number } {
    return { tareas: datos.cantidadTareas, subtareas: datos.cantidadSubtareas, items: datos.cantidadItems };
  }

  cambiarInicio(valor: string): void {
    this.fechaInicio.set(valor);
    const plazo = this.plazo();
    if (valor && plazo != null) {
      this.fechaFin.set(sumarDias(valor, plazo));
    }
  }

  crear(): void {
    const archivo = this.archivo();
    if (!archivo) return;
    if (!this.nombre().trim() || !this.fechaInicio()) {
      this.errorCrear.set('Completá el nombre del proyecto y la fecha de inicio.');
      return;
    }
    this.creando.set(true);
    this.errorCrear.set(null);
    this.importacion
      .importar(archivo, {
        nombre: this.nombre().trim(),
        cliente: this.cliente(),
        refCliente: this.refCliente(),
        atencion: this.atencion(),
        descripcion: this.descripcion(),
        fechaInicio: this.fechaInicio(),
        fechaFin: this.fechaFin() || null,
        tipoCliente: this.tipoCliente() || null,
        tipoObra: this.tipoObra() || null,
      })
      .subscribe({
        next: (proyecto) => {
          this.creando.set(false);
          this.resumenCreado.set(this.resumen(this.previsualizacion()!));
          this.creado.set(proyecto);
          this.ultimoCreadoId.set(proyecto.id);
          this.snackbar.mostrar('Proyecto creado.');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (err) => {
          this.creando.set(false);
          this.errorCrear.set(extraerMensajeError(err, 'No se pudo crear el proyecto.'));
        },
      });
  }

  // Vuelve al listado (después de crear, o al cancelar la revisión).
  cancelar(): void {
    this.archivo.set(null);
    this.lectura.set(null);
    this.previsualizacion.set(null);
    this.errorLectura.set(null);
    this.errorCrear.set(null);
    this.creado.set(null);
    this.listado()?.recargar();
  }

  descargarPlantilla(): void {
    this.importacion.descargarPlantilla().subscribe({
      error: (err) => this.snackbar.mostrar(extraerMensajeError(err, 'No se pudo descargar la planilla.'), 'error'),
    });
  }
}
