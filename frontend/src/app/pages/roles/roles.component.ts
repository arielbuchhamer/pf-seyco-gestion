import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, concat, forkJoin, map, of, switchMap, toArray } from 'rxjs';
import { PuedeDirective } from '../../core/directives/puede.directive';
import {
  ACCIONES,
  Accion,
  Modulo,
  Panel,
  PermisoModulo,
  Rol,
  RolModulo,
  RolPanel,
} from '../../core/models/acceso.model';
import { AuthService } from '../../core/services/auth.service';
import { RolService } from '../../core/services/rol.service';
import { extraerMensajeError } from '../../core/utils/http-error';
import { CabeceraComponent } from '../../shared/cabecera/cabecera.component';
import { ConfirmarDialogComponent } from '../../shared/confirmar/confirmar-dialog.component';
import { PaginadorComponent, paginar } from '../../shared/paginador/paginador.component';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';

type TipoCatalogo = 'modulos' | 'paneles';

const SIN_PERMISO: PermisoModulo = { leer: false, escribir: false, editar: false };
const ROLES_POR_PAGINA = 10;
const CATALOGO_POR_PAGINA = 3;

// Gestión de roles: misma pantalla que el proyecto de referencia (CONTEXTO/frontend/components/
// usuarios/roles) con la estética de esta app. A la izquierda los roles (al hacer clic en uno se
// selecciona); a la derecha los catálogos de módulos y paneles, marcando qué tiene el rol
// seleccionado. Los permisos de cada rol se editan en el diálogo del rol. Todo pide el módulo
// `roles` en el backend (en la base, sólo el rol admin).
@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgTemplateOutlet, PuedeDirective, PaginadorComponent, ConfirmarDialogComponent, CabeceraComponent],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.css',
})
export class RolesComponent {
  private readonly rolService = inject(RolService);
  private readonly snackbar = inject(SnackbarService);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);

  protected readonly acciones = ACCIONES;

  protected readonly roles = signal<Rol[]>([]);
  protected readonly modulos = signal<Modulo[]>([]);
  protected readonly paneles = signal<Panel[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  // ── Paginación (10 roles; 3 módulos y 3 paneles por página, como la referencia) ──
  protected readonly paginaRoles = signal(1);
  protected readonly paginaModulos = signal(1);
  protected readonly paginaPaneles = signal(1);
  protected readonly rolesPagina = computed(() => paginar(this.roles(), this.paginaRoles(), ROLES_POR_PAGINA));
  protected readonly modulosPagina = computed(() =>
    paginar(this.modulos(), this.paginaModulos(), CATALOGO_POR_PAGINA),
  );
  protected readonly panelesPagina = computed(() =>
    paginar(this.paneles(), this.paginaPaneles(), CATALOGO_POR_PAGINA),
  );

  // ── Rol seleccionado (fila resaltada) y lo que tiene asignado ──
  protected readonly rolSeleccionado = signal<Rol | null>(null);
  private readonly modulosDelSeleccionado = signal<RolModulo[]>([]);
  private readonly panelesDelSeleccionado = signal<RolPanel[]>([]);

  // ── Diálogo de rol (ver / agregar / editar) ──
  protected readonly rolDialog = signal<{ rol: Rol | null; soloLectura: boolean } | null>(null);
  protected readonly permisos = signal<Record<number, PermisoModulo>>({});
  protected readonly panelesMarcados = signal<Set<number>>(new Set());
  protected readonly savingRol = signal(false);
  protected readonly rolError = signal<string | null>(null);
  // Lo que el rol tenía al abrir el diálogo, para mandar sólo los cambios.
  private modulosAsignados: RolModulo[] = [];
  private panelesAsignados: RolPanel[] = [];

  protected readonly rolForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(50)]],
    tokenDuracion: [60, [Validators.required, Validators.min(1)]],
  });

  // ── Diálogo de módulo / panel ──
  protected readonly catalogoDialog = signal<{ tipo: TipoCatalogo; item: Modulo | Panel | null } | null>(null);
  protected readonly savingCatalogo = signal(false);
  protected readonly catalogoError = signal<string | null>(null);
  protected readonly catalogoForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(50)]],
  });

  // ── Confirmación de borrado (rol, módulo o panel) ──
  protected readonly eliminando = signal<{ tipo: 'rol' | TipoCatalogo; item: Rol | Modulo | Panel } | null>(null);
  protected readonly procesandoBorrado = signal(false);

  constructor() {
    this.recargarTodo();
  }

  recargarTodo(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      roles: this.rolService.listar(),
      modulos: this.rolService.listarCatalogo('modulos'),
      paneles: this.rolService.listarCatalogo('paneles'),
    }).subscribe({
      next: ({ roles, modulos, paneles }) => {
        this.roles.set(roles);
        this.modulos.set(modulos);
        this.paneles.set(paneles);
        this.loading.set(false);
        // Mantener seleccionado el rol actual; si ya no existe, el primero.
        const actual = roles.find((r) => r.id === this.rolSeleccionado()?.id) ?? roles[0] ?? null;
        this.seleccionarRol(actual);
      },
      error: () => {
        this.errorMessage.set('Error al cargar roles.');
        this.loading.set(false);
      },
    });
  }

  // ── SELECCIÓN ──

  seleccionarRol(rol: Rol | null): void {
    this.rolSeleccionado.set(rol);
    this.modulosDelSeleccionado.set([]);
    this.panelesDelSeleccionado.set([]);
    if (!rol) return;

    forkJoin({ modulos: this.rolService.modulosDelRol(rol.id), paneles: this.rolService.panelesDelRol(rol.id) })
      .subscribe({
        next: ({ modulos, paneles }) => {
          // Si mientras tanto se eligió otro rol, se descarta esta respuesta.
          if (this.rolSeleccionado()?.id !== rol.id) return;
          this.modulosDelSeleccionado.set(modulos);
          this.panelesDelSeleccionado.set(paneles);
        },
      });
  }

  permisoDelSeleccionado(idModulo: number): PermisoModulo {
    return this.modulosDelSeleccionado().find((m) => m.modulo.id === idModulo) ?? SIN_PERMISO;
  }

  seleccionadoVePanel(idPanel: number): boolean {
    return this.panelesDelSeleccionado().some((p) => p.panel.id === idPanel);
  }

  // ── ROLES ──

  abrirRol(rol: Rol | null, soloLectura = false): void {
    this.rolError.set(null);
    this.rolForm.reset({ nombre: rol?.nombre ?? '', tokenDuracion: rol?.tokenDuracion ?? 60 });
    if (soloLectura) {
      this.rolForm.disable();
    } else {
      this.rolForm.enable();
    }

    const asignaciones$ = rol
      ? forkJoin({ modulos: this.rolService.modulosDelRol(rol.id), paneles: this.rolService.panelesDelRol(rol.id) })
      : of({ modulos: [] as RolModulo[], paneles: [] as RolPanel[] });

    asignaciones$.subscribe({
      next: ({ modulos, paneles }) => {
        this.modulosAsignados = modulos;
        this.panelesAsignados = paneles;
        this.permisos.set(
          Object.fromEntries(modulos.map((m) => [m.modulo.id, { leer: m.leer, escribir: m.escribir, editar: m.editar }])),
        );
        this.panelesMarcados.set(new Set(paneles.map((p) => p.panel.id)));
        this.rolDialog.set({ rol, soloLectura });
      },
      error: () => this.snackbar.mostrar('No se pudieron cargar los módulos y paneles.', 'error'),
    });
  }

  cerrarRol(): void {
    this.rolDialog.set(null);
  }

  tienePermiso(idModulo: number, accion: Accion): boolean {
    return this.permisos()[idModulo]?.[accion] ?? false;
  }

  cambiarPermiso(idModulo: number, accion: Accion, valor: boolean): void {
    this.permisos.update((actual) => ({
      ...actual,
      [idModulo]: { ...(actual[idModulo] ?? SIN_PERMISO), [accion]: valor },
    }));
  }

  cambiarPanel(idPanel: number, valor: boolean): void {
    this.panelesMarcados.update((actual) => {
      const nuevo = new Set(actual);
      if (valor) {
        nuevo.add(idPanel);
      } else {
        nuevo.delete(idPanel);
      }
      return nuevo;
    });
  }

  guardarRol(): void {
    if (this.rolForm.invalid) {
      this.rolForm.markAllAsTouched();
      return;
    }
    const dialogo = this.rolDialog();
    if (!dialogo) return;

    const datos = this.rolForm.getRawValue();
    this.savingRol.set(true);
    this.rolError.set(null);

    const rol$ = dialogo.rol ? this.rolService.actualizar(dialogo.rol.id, datos) : this.rolService.crear(datos);

    rol$
      .pipe(switchMap((rol) => this.guardarAsignaciones(rol.id).pipe(map(() => rol))))
      .subscribe({
        next: (rol) => {
          this.savingRol.set(false);
          this.rolDialog.set(null);
          this.rolSeleccionado.set(rol);
          this.recargarTodo();
          // Si se cambiaron los permisos del propio rol, el menú y los botones se actualizan ya.
          this.auth.checkSession().subscribe();
          this.snackbar.mostrar(dialogo.rol ? 'Rol actualizado correctamente.' : 'Rol creado correctamente.');
        },
        error: (err) => {
          this.savingRol.set(false);
          this.recargarTodo();
          this.rolError.set(
            extraerMensajeError(err, 'No se pudo guardar el rol. Verificá los datos e intentá nuevamente.'),
          );
        },
      });
  }

  // Igual que la referencia: módulo ya asignado -> PUT con los permisos (todo en false lo quita);
  // no asignado -> POST. Paneles: POST al marcar "ver", DELETE al desmarcarlo.
  private guardarAsignaciones(idRol: number): Observable<unknown> {
    const pedidos: Observable<unknown>[] = [];

    for (const modulo of this.modulos()) {
      const permiso = this.permisos()[modulo.id] ?? SIN_PERMISO;
      const asignado = this.modulosAsignados.find((m) => m.modulo.id === modulo.id);
      if (asignado) {
        if (ACCIONES.some((accion) => asignado[accion] !== permiso[accion])) {
          pedidos.push(this.rolService.actualizarModulo(idRol, modulo.id, permiso));
        }
      } else if (ACCIONES.some((accion) => permiso[accion])) {
        pedidos.push(this.rolService.asignarModulo(idRol, modulo.id, permiso));
      }
    }

    for (const panel of this.paneles()) {
      const marcado = this.panelesMarcados().has(panel.id);
      const asignado = this.panelesAsignados.some((p) => p.panel.id === panel.id);
      if (marcado && !asignado) {
        pedidos.push(this.rolService.asignarPanel(idRol, panel.id));
      } else if (!marcado && asignado) {
        pedidos.push(this.rolService.desasignarPanel(idRol, panel.id));
      }
    }

    return pedidos.length ? concat(...pedidos).pipe(toArray()) : of(null);
  }

  // ── CATÁLOGOS: MÓDULOS Y PANELES ──

  abrirCatalogo(tipo: TipoCatalogo, item: Modulo | Panel | null): void {
    this.catalogoError.set(null);
    this.catalogoForm.reset({ nombre: item?.nombre ?? '' });
    this.catalogoDialog.set({ tipo, item });
  }

  cerrarCatalogo(): void {
    this.catalogoDialog.set(null);
  }

  guardarCatalogo(): void {
    if (this.catalogoForm.invalid) {
      this.catalogoForm.markAllAsTouched();
      return;
    }
    const dialogo = this.catalogoDialog();
    if (!dialogo) return;

    const { nombre } = this.catalogoForm.getRawValue();
    const etiqueta = dialogo.tipo === 'modulos' ? 'Módulo' : 'Panel';
    this.savingCatalogo.set(true);
    this.catalogoError.set(null);

    const pedido = dialogo.item
      ? this.rolService.actualizarEnCatalogo(dialogo.tipo, dialogo.item.id, nombre)
      : this.rolService.crearEnCatalogo(dialogo.tipo, nombre);

    pedido.subscribe({
      next: () => {
        this.savingCatalogo.set(false);
        this.catalogoDialog.set(null);
        this.recargarTodo();
        this.snackbar.mostrar(`${etiqueta} ${dialogo.item ? 'actualizado' : 'creado'} correctamente.`);
      },
      error: (err) => {
        this.savingCatalogo.set(false);
        this.catalogoError.set(extraerMensajeError(err, `No se pudo guardar el ${etiqueta.toLowerCase()}.`));
      },
    });
  }

  // ── ELIMINAR (rol, módulo o panel) ──

  abrirEliminar(tipo: 'rol' | TipoCatalogo, item: Rol | Modulo | Panel): void {
    this.eliminando.set({ tipo, item });
  }

  etiqueta(tipo: 'rol' | TipoCatalogo): string {
    return tipo === 'rol' ? 'rol' : tipo === 'modulos' ? 'módulo' : 'panel';
  }

  confirmarEliminar(): void {
    const objetivo = this.eliminando();
    if (!objetivo) return;

    const etiqueta = this.etiqueta(objetivo.tipo);
    const pedido =
      objetivo.tipo === 'rol'
        ? this.rolService.eliminar(objetivo.item.id)
        : this.rolService.eliminarDeCatalogo(objetivo.tipo, objetivo.item.id);

    this.procesandoBorrado.set(true);
    pedido.subscribe({
      next: () => {
        this.procesandoBorrado.set(false);
        this.eliminando.set(null);
        if (objetivo.tipo === 'rol' && this.rolSeleccionado()?.id === objetivo.item.id) {
          this.rolSeleccionado.set(null);
        }
        this.recargarTodo();
        this.auth.checkSession().subscribe();
        this.snackbar.mostrar(`${etiqueta[0].toUpperCase()}${etiqueta.slice(1)} eliminado correctamente.`);
      },
      error: (err) => {
        this.procesandoBorrado.set(false);
        this.eliminando.set(null);
        this.snackbar.mostrar(extraerMensajeError(err, `No se pudo eliminar el ${etiqueta}.`), 'error');
      },
    });
  }
}
