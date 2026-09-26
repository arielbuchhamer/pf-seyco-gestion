import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ROLES, ROL_LABEL, Rol, Usuario, UsuarioInput, nombreCompleto } from '../../core/models/usuario.model';
import { AvatarComponent } from '../../shared/avatar/avatar.component';
import { AuthService } from '../../core/services/auth.service';
import { UsuarioService } from '../../core/services/usuario.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [ReactiveFormsModule, AvatarComponent],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css',
})
export class UsuariosComponent {
  private readonly usuarioService = inject(UsuarioService);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);

  protected readonly roles = ROLES;
  protected readonly rolLabel = ROL_LABEL;
  protected readonly nombreCompleto = nombreCompleto;

  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly showForm = signal(false);
  protected readonly editingUsuario = signal<Usuario | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    clave: [''],
    rol: ['USUARIO' as Rol, [Validators.required]],
  });

  constructor() {
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
        this.errorMessage.set('No se pudo cargar la lista de usuarios.');
        this.loading.set(false);
      },
    });
  }

  abrirCrear(): void {
    this.editingUsuario.set(null);
    this.formError.set(null);
    this.showPassword.set(false);
    this.form.reset({ nombre: '', apellido: '', email: '', clave: '', rol: 'USUARIO' });
    this.showForm.set(true);
  }

  abrirEditar(usuario: Usuario): void {
    this.editingUsuario.set(usuario);
    this.formError.set(null);
    this.showPassword.set(false);
    this.form.reset({
      nombre: usuario.nombre ?? '',
      apellido: usuario.apellido ?? '',
      email: usuario.email,
      clave: '',
      rol: usuario.rol,
    });
    this.showForm.set(true);
  }

  cerrarForm(): void {
    this.showForm.set(false);
  }

  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nombre, apellido, email, clave, rol } = this.form.getRawValue();
    const editing = this.editingUsuario();

    // Al crear la contraseña es obligatoria; al editar, vacía = "no cambiarla".
    if (!editing && !clave) {
      this.formError.set('La contraseña es obligatoria para un usuario nuevo.');
      return;
    }

    const payload: UsuarioInput = clave
      ? { nombre, apellido, email, clave, rol }
      : { nombre, apellido, email, rol };

    this.saving.set(true);
    this.formError.set(null);

    const request = editing
      ? this.usuarioService.actualizar(editing.id, payload)
      : this.usuarioService.crear(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.cargar();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(this.extraerMensaje(err, 'No se pudo guardar el usuario. Revisá los datos.'));
      },
    });
  }

  eliminar(usuario: Usuario): void {
    if (!confirm(`¿Eliminar el usuario ${nombreCompleto(usuario)}?`)) {
      return;
    }

    this.errorMessage.set(null);
    this.usuarioService.eliminar(usuario.id).subscribe({
      next: () => this.cargar(),
      error: (err) => {
        this.errorMessage.set(this.extraerMensaje(err, 'No se pudo eliminar el usuario.'));
      },
    });
  }

  // El backend devuelve el mensaje real como body de texto plano (ver @ExceptionHandler en
  // UsuarioController); como HttpClient espera JSON por defecto, Angular envuelve un body no-JSON
  // en err.error = { text: "<mensaje original>" }. Si no viene nada reconocible, se usa el fallback.
  private extraerMensaje(err: unknown, fallback: string): string {
    const httpError = err as { error?: unknown };
    const body = httpError?.error;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    if (body && typeof body === 'object' && typeof (body as { text?: unknown }).text === 'string') {
      return (body as { text: string }).text;
    }
    return fallback;
  }
}
