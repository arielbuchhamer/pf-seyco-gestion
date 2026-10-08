import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { extraerMensajeError } from '../../core/utils/http-error';

// login: ingresar   recuperar: pedir el link por correo   restablecer: elegir la contraseña nueva
type Seccion = 'login' | 'recuperar' | 'restablecer';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, NgTemplateOutlet],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Token del link del correo de recuperación (/login?restablecer=<token>). Llega como input
  // gracias a withComponentInputBinding() (ver app.config.ts).
  readonly restablecer = input<string>();

  protected readonly seccion = signal<Seccion>('login');
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  // La complejidad de contraseña (8+ caracteres y un número) es una regla de
  // alta/edición, no de login: acá solo validamos que los campos no estén vacíos.
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required]],
  });

  protected readonly recuperarForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly restablecerForm = this.fb.nonNullable.group({
    contrasena: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/\d/)]],
    repetir: ['', [Validators.required]],
  });

  ngOnInit(): void {
    if (this.restablecer()) {
      this.mostrar('restablecer');
    }
  }

  mostrar(seccion: Seccion): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.showPassword.set(false);
    // Si ya había escrito el email en el login, se reutiliza.
    if (seccion === 'recuperar' && !this.recuperarForm.controls.email.value) {
      this.recuperarForm.controls.email.setValue(this.form.controls.email.value);
    }
    this.seccion.set(seccion);
  }

  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { email, contrasena } = this.form.getRawValue();
    this.auth.login(email, contrasena).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        // 401 = credenciales incorrectas; otro error (ej. backend caído) se muestra tal cual.
        this.errorMessage.set(
          err?.status === 401
            ? 'Email o contraseña incorrectos.'
            : extraerMensajeError(err, 'No se pudo conectar con el servidor. Intentá nuevamente.'),
        );
        this.loading.set(false);
      },
    });
  }

  // 1) Pedir el link. El backend responde lo mismo exista o no la cuenta.
  enviarRecuperacion(): void {
    if (this.recuperarForm.invalid) {
      this.recuperarForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.auth.solicitarRecuperacion(this.recuperarForm.getRawValue().email).subscribe({
      next: (respuesta) => {
        this.successMessage.set(respuesta.message);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(extraerMensajeError(err, 'No se pudo enviar el correo. Intentá nuevamente.'));
        this.loading.set(false);
      },
    });
  }

  // 2) Guardar la contraseña nueva con el token del link.
  guardarContrasena(): void {
    if (this.restablecerForm.invalid) {
      this.restablecerForm.markAllAsTouched();
      return;
    }
    const { contrasena, repetir } = this.restablecerForm.getRawValue();
    if (contrasena !== repetir) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth.restablecerContrasena(this.restablecer() ?? '', contrasena).subscribe({
      next: (respuesta) => {
        this.loading.set(false);
        this.restablecerForm.reset();
        this.mostrar('login');
        this.successMessage.set(respuesta.message);
        // Saca el token de la URL: ya no sirve y no debería quedar en el historial.
        this.router.navigate(['/login'], { replaceUrl: true });
      },
      error: (err) => {
        this.errorMessage.set(extraerMensajeError(err, 'No se pudo guardar la contraseña. Intentá nuevamente.'));
        this.loading.set(false);
      },
    });
  }
}
