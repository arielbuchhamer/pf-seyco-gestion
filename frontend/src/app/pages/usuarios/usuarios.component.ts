import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, catchError, concat, of, switchMap, throwError, toArray } from 'rxjs';
import { PuedeDirective } from '../../core/directives/puede.directive';
import { Rol } from '../../core/models/acceso.model';
import { UsuarioInput, UsuarioListado, nombreCompleto } from '../../core/models/usuario.model';
import { AuthService } from '../../core/services/auth.service';
import { RolService } from '../../core/services/rol.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { extraerMensajeError } from '../../core/utils/http-error';
import { AvatarComponent } from '../../shared/avatar/avatar.component';
import { alternar, enRango } from '../../core/utils/seguimiento';
import { CabeceraComponent } from '../../shared/cabecera/cabecera.component';
import { ConfirmarDialogComponent } from '../../shared/confirmar/confirmar-dialog.component';
import { FiltroFechasComponent } from '../../shared/filtros/filtro-fechas.component';
import { PanelFiltrosComponent } from '../../shared/filtros/panel-filtros.component';
import { PaginadorComponent, paginar } from '../../shared/paginador/paginador.component';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';

const USUARIOS_POR_PAGINA = 10;

// Gestión de usuarios: misma pantalla que el proyecto de referencia (CONTEXTO/frontend/
// components/usuarios/usuarios) con la estética de esta app. El rol se guarda aparte, en
// roles_usuarios (POST/DELETE /api/roles/{id}/usuarios), igual que allá.
@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe, AvatarComponent, PuedeDirective, PaginadorComponent, ConfirmarDialogComponent, CabeceraComponent, FiltroFechasComponent, PanelFiltrosComponent],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css',
})
export class UsuariosComponent {
  private readonly usuarioService = inject(UsuarioService);
  private readonly rolService = inject(RolService);
  private readonly snackbar = inject(SnackbarService);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);

  protected readonly usuarios = signal<UsuarioListado[]>([]);
  protected readonly roles = signal<Rol[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly paginaActual = signal(1);
  protected readonly pagina = computed(() => paginar(this.filtrados(), this.paginaActual(), USUARIOS_POR_PAGINA));

  // ── Filtros de la cabecera (fecha de alta, búsqueda, rol y activos/dados de baja) ──
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly busqueda = signal('');
  protected readonly rolesFiltro = signal<number[]>([]);
  protected readonly estadosFiltro = signal<('activo' | 'baja')[]>([]);
  protected readonly alternar = alternar;
  protected readonly cantidadFiltros = computed(
    () => (this.busqueda().trim() ? 1 : 0) + this.rolesFiltro().length + this.estadosFiltro().length,
  );

  protected readonly filtrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    return this.usuarios().filter(
      (u) =>
        (!q || `${u.nombre ?? ''} ${u.apellido ?? ''} ${u.email}`.toLowerCase().includes(q)) &&
        (!this.rolesFiltro().length || u.roles.some((r) => this.rolesFiltro().includes(r.id))) &&
        (!this.estadosFiltro().length || this.estadosFiltro().includes(u.fechaBaja ? 'baja' : 'activo')) &&
        enRango(u.fechaAlta, this.desde(), this.hasta()),
    );
  });

  // Cambiar un filtro vuelve a la primera página.
  filtrar(aplicar: () => void): void {
    aplicar();
    this.paginaActual.set(1);
  }

  limpiarFiltros(): void {
    this.filtrar(() => {
      this.busqueda.set('');
      this.rolesFiltro.set([]);
      this.estadosFiltro.set([]);
    });
  }

  // ── Alta / edición ──
  protected readonly showForm = signal(false);
  protected readonly editingUsuario = signal<UsuarioListado | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  // ── Baja ──
  protected readonly eliminando = signal<UsuarioListado | null>(null);
  protected readonly procesandoBaja = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(50)]],
    nombre: ['', [Validators.required, Validators.maxLength(50)]],
    apellido: ['', [Validators.required, Validators.maxLength(50)]],
    contrasena: [''],
    dni: ['', [Validators.required, Validators.pattern(/^[1-9]\d{0,8}$/)]],
    telefono: ['', [Validators.maxLength(50)]],
    idRol: ['', [Validators.required]],
  });

  constructor() {
    this.recargar();
  }

  recargar(): void {
    this.paginaActual.set(1);
    this.cargar();
  }

  private cargar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.usuarioService.listar().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Error al cargar usuarios.');
        this.loading.set(false);
      },
    });
  }

  rolesTexto(usuario: UsuarioListado): string {
    return usuario.roles.map((r) => r.nombre).join(', ') || 'Sin rol';
  }

  esUnoMismo(usuario: UsuarioListado): boolean {
    return usuario.id === this.auth.currentUser()?.id;
  }

  // ── AGREGAR / EDITAR ──

  abrirCrear(): void {
    this.abrirFormulario(null);
  }

  abrirEditar(usuario: UsuarioListado): void {
    this.abrirFormulario(usuario);
  }

  private abrirFormulario(usuario: UsuarioListado | null): void {
    // Los roles se piden cada vez, como en la referencia: así aparece un rol recién creado.
    this.rolService.listar().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.editingUsuario.set(usuario);
        this.formError.set(null);
        this.showPassword.set(false);
        this.form.reset({
          email: usuario?.email ?? '',
          nombre: usuario?.nombre ?? '',
          apellido: usuario?.apellido ?? '',
          contrasena: '',
          dni: usuario?.dni != null ? String(usuario.dni) : '',
          telefono: usuario?.telefono ?? '',
          idRol: usuario?.roles[0] ? String(usuario.roles[0].id) : '',
        });
        // El propio rol no se cambia desde acá: evita quedarse sin acceso a esta pantalla por error.
        if (usuario && this.esUnoMismo(usuario)) {
          this.form.controls.idRol.disable();
        } else {
          this.form.controls.idRol.enable();
        }
        this.showForm.set(true);
      },
      error: () => this.snackbar.mostrar('No se pudieron cargar los roles.', 'error'),
    });
  }

  cerrarForm(): void {
    this.showForm.set(false);
  }

  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  guardar(): void {
    const editing = this.editingUsuario();
    const { email, nombre, apellido, contrasena, dni, telefono, idRol } = this.form.getRawValue();

    // Contraseña obligatoria únicamente al crear.
    if (this.form.invalid || (!editing && !contrasena)) {
      this.form.markAllAsTouched();
      if (!editing && !contrasena) {
        this.formError.set('La contraseña es obligatoria para un usuario nuevo.');
      }
      return;
    }

    const datos: UsuarioInput = {
      email: email.trim(),
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      dni: Number(dni),
      telefono: telefono.trim() || null,
      // Al editar, sólo se manda si se escribió una nueva.
      ...(contrasena ? { contrasena } : {}),
    };

    this.saving.set(true);
    this.formError.set(null);

    const pedido = editing ? this.actualizar(editing, datos, Number(idRol)) : this.crear(datos, Number(idRol));

    pedido.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.recargar();
        this.snackbar.mostrar(editing ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.');
      },
      error: (err) => {
        this.saving.set(false);
        this.cargar();
        this.formError.set(
          extraerMensajeError(
            err,
            editing
              ? 'No se pudo actualizar el usuario. Verificá los datos e intentá nuevamente.'
              : 'No se pudo crear el usuario. Verificá los datos e intentá nuevamente.',
          ),
        );
      },
    });
  }

  // 1. Crear el usuario  2. Asignarle el rol. Si falla el rol, se da de baja el usuario recién
  // creado para no dejarlo sin la asociación pedida (igual que la referencia).
  private crear(datos: UsuarioInput, idRol: number): Observable<unknown> {
    return this.usuarioService.crear(datos).pipe(
      switchMap((usuario) =>
        this.rolService.asignarUsuario(idRol, usuario.id).pipe(
          catchError((errorRol) =>
            this.usuarioService.eliminar(usuario.id).pipe(
              catchError(() => of(null)),
              switchMap(() => throwError(() => errorRol)),
            ),
          ),
        ),
      ),
    );
  }

  // 1. Actualizar los datos  2. Cambiar el rol si corresponde (quitar el anterior, asignar el nuevo).
  private actualizar(usuario: UsuarioListado, datos: UsuarioInput, idRol: number): Observable<unknown> {
    const rolAnterior = usuario.roles[0]?.id ?? null;
    const cambiarRol = !this.esUnoMismo(usuario) && rolAnterior !== idRol;

    return this.usuarioService.actualizar(usuario.id, datos).pipe(
      switchMap(() => {
        if (!cambiarRol) {
          return of(null);
        }
        const pedidos: Observable<unknown>[] = [
          ...usuario.roles.map((rol) => this.rolService.desasignarUsuario(rol.id, usuario.id)),
          this.rolService.asignarUsuario(idRol, usuario.id),
        ];
        return concat(...pedidos).pipe(toArray());
      }),
    );
  }

  // ── ELIMINAR ──

  abrirEliminar(usuario: UsuarioListado): void {
    this.eliminando.set(usuario);
  }

  confirmarEliminar(): void {
    const usuario = this.eliminando();
    if (!usuario) return;

    this.procesandoBaja.set(true);
    this.usuarioService.eliminar(usuario.id).subscribe({
      next: () => {
        this.procesandoBaja.set(false);
        this.eliminando.set(null);
        this.recargar();
        this.snackbar.mostrar('Usuario eliminado correctamente.');
      },
      error: (err) => {
        this.procesandoBaja.set(false);
        this.eliminando.set(null);
        this.snackbar.mostrar(extraerMensajeError(err, 'No se pudo eliminar el usuario.'), 'error');
      },
    });
  }

  identificacion(usuario: UsuarioListado): string {
    return nombreCompleto(usuario);
  }
}
