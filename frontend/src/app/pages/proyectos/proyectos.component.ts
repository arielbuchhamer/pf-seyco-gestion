import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { switchMap, throwError } from 'rxjs';
import { PuedeDirective } from '../../core/directives/puede.directive';
import { DatosImportacion, Previsualizacion } from '../../core/models/presupuesto.model';
import { Proyecto } from '../../core/models/proyecto.model';
import { AuthService } from '../../core/services/auth.service';
import { ImportacionService } from '../../core/services/importacion.service';
import { hoy, pesos, sumarDias } from '../../core/utils/formato';
import { extraerMensajeError } from '../../core/utils/http-error';
import { DistribucionRubrosComponent } from '../../shared/presupuesto/distribucion-rubros.component';
import { PresupuestoTablaComponent } from '../../shared/presupuesto/presupuesto-tabla.component';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';
import { ResumenImportacionComponent } from './resumen-importacion.component';
import { UltimosProyectosComponent } from './ultimos-proyectos.component';
import { AccionCarga, ZonaCargaComponent } from './zona-carga.component';

// Pantalla Proyectos: el alta de proyectos es sólo desde el Excel de presupuesto, y al lado
// los últimos proyectos. Se sube el archivo y después se elige: Revisar (previsualización
// editable y confirmar) o Crear proyecto directo con los datos del Excel.
@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [
    RouterLink,
    PuedeDirective,
    ZonaCargaComponent,
    UltimosProyectosComponent,
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

  private readonly ultimos = viewChild(UltimosProyectosComponent);

  protected readonly pesos = pesos;
  protected readonly puedeImportar = computed(() => this.auth.puede('proyectos', 'escribir'));

  protected readonly archivo = signal<File | null>(null);
  protected readonly previsualizacion = signal<Previsualizacion | null>(null);
  protected readonly accion = signal<AccionCarga | null>(null);
  protected readonly errorLectura = signal<string | null>(null);

  // "Datos del proyecto": precargados desde el encabezado del Excel, editables.
  protected readonly nombre = signal('');
  protected readonly cliente = signal('');
  protected readonly refCliente = signal('');
  protected readonly atencion = signal('');
  protected readonly descripcion = signal('');
  protected readonly fechaInicio = signal('');
  protected readonly fechaFin = signal('');

  protected readonly creando = signal(false);
  protected readonly errorCrear = signal<string | null>(null);
  protected readonly creado = signal<Proyecto | null>(null);
  // Último proyecto creado en esta pantalla: se marca "Nuevo" en la lista aunque después se
  // toque "Importar otro" (que limpia `creado`).
  protected readonly ultimoCreadoId = signal<number | null>(null);
  // Cantidades del banner "Proyecto creado" (también cuando se crea sin revisar).
  protected readonly resumenCreado = signal<{ tareas: number; subtareas: number; items: number } | null>(null);

  protected readonly plazo = computed(() => this.previsualizacion()?.encabezado.plazoDias ?? null);

  elegir(archivo: File): void {
    this.archivo.set(archivo);
    this.errorLectura.set(null);
    this.creado.set(null);
  }

  quitarArchivo(): void {
    this.archivo.set(null);
    this.errorLectura.set(null);
  }

  revisar(): void {
    const archivo = this.archivo();
    if (!archivo) return;
    this.accion.set('revisar');
    this.errorLectura.set(null);
    this.importacion.previsualizar(archivo).subscribe({
      next: (datos) => {
        this.accion.set(null);
        this.mostrarPrevisualizacion(datos);
      },
      error: (err) => {
        this.accion.set(null);
        this.errorLectura.set(extraerMensajeError(err, 'No se pudo leer el archivo.'));
      },
    });
  }

  // Crear sin revisar: lee el Excel y, si no tiene errores, lo importa con los datos del
  // encabezado tal cual (inicio hoy, fin = hoy + plazo). Si tiene errores, muestra la
  // previsualización para que se vea la verificación.
  crearDirecto(): void {
    const archivo = this.archivo();
    if (!archivo) return;
    this.accion.set('crear');
    this.errorLectura.set(null);
    this.importacion
      .previsualizar(archivo)
      .pipe(
        switchMap((datos) => {
          if (!datos.puedeImportar) {
            this.mostrarPrevisualizacion(datos);
            return throwError(() => new Error('El Excel tiene errores: revisá la verificación automática más abajo.'));
          }
          this.resumenCreado.set(this.resumen(datos));
          return this.importacion.importar(archivo, this.datosDelExcel(datos));
        }),
      )
      .subscribe({
        next: (proyecto) => {
          this.accion.set(null);
          this.archivo.set(null);
          this.proyectoCreado(proyecto);
        },
        error: (err) => {
          this.accion.set(null);
          this.errorLectura.set(this.mensajeError(err));
        },
      });
  }

  private mostrarPrevisualizacion(datos: Previsualizacion): void {
    this.previsualizacion.set(datos);
    const e = datos.encabezado;
    this.nombre.set(e.obra ?? '');
    this.cliente.set(e.cliente ?? '');
    this.refCliente.set(e.refCliente ?? '');
    this.atencion.set(e.atencion ?? '');
    this.descripcion.set('');
    this.errorCrear.set(null);
    this.fechaFin.set('');
    this.cambiarInicio(hoy());
  }

  private datosDelExcel(datos: Previsualizacion): DatosImportacion {
    const e = datos.encabezado;
    const inicio = hoy();
    return {
      nombre: e.obra ?? '',
      cliente: e.cliente ?? '',
      refCliente: e.refCliente ?? '',
      atencion: e.atencion ?? '',
      descripcion: '',
      fechaInicio: inicio,
      fechaFin: e.plazoDias != null ? sumarDias(inicio, e.plazoDias) : null,
    };
  }

  private mensajeError(err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) {
      return err instanceof Error ? err.message : 'No se pudo crear el proyecto.';
    }
    const mensaje = extraerMensajeError(err, 'No se pudo crear el proyecto.');
    // Nombre repetido o falta «Obra:» en el Excel: se corrige desde Revisar.
    return err.status === 409 || err.status === 400
      ? `${mensaje} Usá «Revisar» para corregir los datos del proyecto.`
      : mensaje;
  }

  private resumen(datos: Previsualizacion): { tareas: number; subtareas: number; items: number } {
    return { tareas: datos.cantidadTareas, subtareas: datos.cantidadSubtareas, items: datos.cantidadItems };
  }

  private proyectoCreado(proyecto: Proyecto): void {
    this.creado.set(proyecto);
    this.ultimoCreadoId.set(proyecto.id);
    this.ultimos()?.recargar();
    this.snackbar.mostrar('Proyecto creado.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      })
      .subscribe({
        next: (proyecto) => {
          this.creando.set(false);
          this.resumenCreado.set(this.resumen(this.previsualizacion()!));
          this.proyectoCreado(proyecto);
        },
        error: (err) => {
          this.creando.set(false);
          this.errorCrear.set(extraerMensajeError(err, 'No se pudo crear el proyecto.'));
        },
      });
  }

  cancelar(): void {
    this.archivo.set(null);
    this.accion.set(null);
    this.previsualizacion.set(null);
    this.errorLectura.set(null);
    this.errorCrear.set(null);
    this.creado.set(null);
  }

  descargarPlantilla(): void {
    this.importacion.descargarPlantilla().subscribe({
      error: (err) => this.snackbar.mostrar(extraerMensajeError(err, 'No se pudo descargar la planilla.'), 'error'),
    });
  }
}
