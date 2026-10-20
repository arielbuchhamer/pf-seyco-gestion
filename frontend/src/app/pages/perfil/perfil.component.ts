import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PerfilInput, Usuario, nombreCompleto } from '../../core/models/usuario.model';
import { PerfilService } from '../../core/services/perfil.service';
import { extraerMensajeError } from '../../core/utils/http-error';
import { AvatarComponent } from '../../shared/avatar/avatar.component';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';

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

// Validaciones alineadas con UsuarioService.actualizarPerfil del backend.
@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe, AvatarComponent],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css',
})
export class PerfilComponent {
  private readonly perfilService = inject(PerfilService);
  private readonly snackbar = inject(SnackbarService);
  private readonly fb = inject(FormBuilder);

  protected readonly perfil = signal<Usuario | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly editando = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(50)]],
    apellido: ['', [Validators.required, Validators.maxLength(50)]],
    dni: ['', [dniValidator]],
    telefono: ['', [soloNumerosValidator, Validators.maxLength(50)]],
  });

  constructor() {
    this.cargar();
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
        this.errorMessage.set('Error al cargar tu perfil.');
        this.loading.set(false);
      },
    });
  }

  nombre(perfil: Usuario): string {
    return nombreCompleto(perfil);
  }

  editar(): void {
    const perfil = this.perfil();
    if (!perfil) return;

    this.formError.set(null);
    this.form.reset({
      nombre: perfil.nombre ?? '',
      apellido: perfil.apellido ?? '',
      dni: perfil.dni != null ? String(perfil.dni) : '',
      telefono: perfil.telefono ?? '',
    });
    this.editando.set(true);
  }

  // No hace falta resetear el formulario: editar() lo vuelve a cargar desde el perfil.
  cancelar(): void {
    this.editando.set(false);
    this.formError.set(null);
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
        this.editando.set(false);
        this.snackbar.mostrar('Perfil actualizado correctamente.');
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(
          extraerMensajeError(
            err,
            'No se pudo actualizar el perfil. Verificá los datos e intentá nuevamente.',
          ),
        );
      },
    });
  }
}
