import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  // La complejidad de contraseña (8+ caracteres y un número) es una regla de
  // alta/edición, no de login: acá solo validamos que los campos no estén vacíos.
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    clave: ['', [Validators.required]],
  });

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

    const { email, clave } = this.form.getRawValue();
    this.auth.login(email, clave).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {
        this.errorMessage.set('Email o contraseña incorrectos.');
        this.loading.set(false);
      },
    });
  }
}
