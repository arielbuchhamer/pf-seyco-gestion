import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { AfterViewInit, Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { PerfilInput, Usuario, nombreCompleto } from '../../core/models/usuario.model';
import { AuthService } from '../../core/services/auth.service';
import { PerfilService } from '../../core/services/perfil.service';
import { extraerMensajeError } from '../../core/utils/http-error';
import { AvatarComponent } from '../avatar/avatar.component';
import { SnackbarService } from '../snackbar/snackbar.service';

const SOLO_NUMEROS = /^\d+$/;

// Si trae algo que no es número, ese error gana aunque también falten o sobren dígitos.
function dniValidator(control: AbstractControl<string>): ValidationErrors | null {
  const valor = control.value.trim();
  if (!valor) return null;
  if (!SOLO_NUMEROS.test(valor)) return { soloNumeros: true };
  if (!/^[1-9]\d{6,7}$/.test(valor)) return { dniInvalido: true };
  return null;
}

function soloNumerosValidator(control: AbstractControl<string>): ValidationErrors | null {
  const valor = control.value.trim();
  return valor && !SOLO_NUMEROS.test(valor) ? { soloNumeros: true } : null;
}

function coincidenValidator(grupo: AbstractControl): ValidationErrors | null {
  const { nueva, repetir } = grupo.value as { nueva: string; repetir: string };
  return repetir && nueva !== repetir ? { noCoinciden: true } : null;
}

type Vista = 'ver' | 'editar' | 'contrasena';
type CampoClave = 'actual' | 'nueva' | 'repetir';

// Diálogo "Mi perfil" (menú del usuario en la barra superior): ver los datos propios, editarlos
// y cambiar la contraseña. Usa <dialog> nativo (Escape y foco atrapado los da el navegador) con
// el aspecto de los demás diálogos de la plataforma (.dialog en styles.css).
// Validaciones alineadas con UsuarioService (actualizarPerfil y cambiarContrasena) del backend.
@Component({
  selector: 'app-perfil-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, NgTemplateOutlet, AvatarComponent],
  templateUrl: './perfil-dialog.component.html',
  styleUrl: './perfil-dialog.component.css',
})
export class PerfilDialogComponent implements AfterViewInit {
  private readonly perfilService = inject(PerfilService);
  private readonly snackbar = inject(SnackbarService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly cerrar = output<void>();

  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  protected readonly perfil = signal<Usuario | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly vista = signal<Vista>('ver');
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly visibles = signal<Record<CampoClave, boolean>>({ actual: false, nueva: false, repetir: false });

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(50)]],
    apellido: ['', [Validators.required, Validators.maxLength(50)]],
    dni: ['', [dniValidator]],
    telefono: ['', [soloNumerosValidator, Validators.maxLength(50)]],
  });

  // Misma regla que el backend: 8 a 72 caracteres y al menos un número.
  protected readonly claveForm = this.fb.nonNullable.group(
    {
      actual: ['', Validators.required],
      nueva: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72), Validators.pattern(/\d/)]],
      repetir: ['', Validators.required],
    },
    { validators: coincidenValidator },
  );

  constructor() {
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.dialogo().nativeElement.showModal();
  }

  cargar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.perfilService.obtener().subscribe({
      next: (perfil) => {
        this.perfil.set(perfil);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No pudimos cargar tus datos.');
        this.loading.set(false);
      },
    });
  }

  nombre(perfil: Usuario): string {
    return nombreCompleto(perfil);
  }

  roles(): string[] {
    return this.auth.currentUser()?.roles ?? [];
  }

  titulo(): string {
    return { ver: 'Mi perfil', editar: 'Editar mi perfil', contrasena: 'Cambiar contraseña' }[this.vista()];
  }

  // Se emite al cerrarse el <dialog> (botón X, Cerrar o Escape): el shell lo quita.
  cerrado(): void {
    this.cerrar.emit();
  }

  salir(): void {
    this.dialogo().nativeElement.close();
  }

  // Escape mientras se guarda: no se cierra a mitad del pedido.
  cancelarEscape(evento: Event): void {
    if (this.saving()) evento.preventDefault();
  }

  // Clic en el fondo oscuro: el evento llega con el propio <dialog> como target.
  clicFondo(evento: MouseEvent): void {
    if (evento.target === this.dialogo().nativeElement && !this.saving()) this.salir();
  }

  editar(): void {
    const perfil = this.perfil();
    if (!perfil) return;
    this.form.reset({
      nombre: perfil.nombre ?? '',
      apellido: perfil.apellido ?? '',
      dni: perfil.dni != null ? String(perfil.dni) : '',
      telefono: perfil.telefono ?? '',
    });
    this.irA('editar');
  }

  cambiarClave(): void {
    this.claveForm.reset();
    this.visibles.set({ actual: false, nueva: false, repetir: false });
    this.irA('contrasena');
  }

  irA(vista: Vista): void {
    this.formError.set(null);
    this.vista.set(vista);
  }

  esVisible(campo: CampoClave): boolean {
    return this.visibles()[campo];
  }

  alternarVisible(campo: CampoClave): void {
    this.visibles.update((v) => ({ ...v, [campo]: !v[campo] }));
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nombre, apellido, dni, telefono } = this.form.getRawValue();
    const datos: PerfilInput = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      dni: dni.trim() || null,
      telefono: telefono.trim() || null,
    };

    this.saving.set(true);
    this.formError.set(null);
    this.perfilService.actualizar(datos).subscribe({
      next: (perfil) => {
        this.perfil.set(perfil);
        this.saving.set(false);
        this.vista.set('ver');
        this.snackbar.mostrar('Perfil actualizado correctamente.');
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(
          extraerMensajeError(err, 'No se pudo actualizar el perfil. Verificá los datos e intentá nuevamente.'),
        );
      },
    });
  }

  guardarClave(): void {
    if (this.claveForm.invalid) {
      this.claveForm.markAllAsTouched();
      return;
    }

    const { actual, nueva } = this.claveForm.getRawValue();
    this.saving.set(true);
    this.formError.set(null);
    this.perfilService.cambiarContrasena(actual, nueva).subscribe({
      next: (respuesta) => {
        this.saving.set(false);
        this.vista.set('ver');
        this.snackbar.mostrar(respuesta.message);
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(extraerMensajeError(err, 'No se pudo cambiar la contraseña. Intentá nuevamente.'));
      },
    });
  }
}
