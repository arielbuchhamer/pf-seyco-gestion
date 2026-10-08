import { Injectable, signal } from '@angular/core';

export interface Aviso {
  mensaje: string;
  tipo: 'success' | 'error';
}

// Aviso flotante de "Guardado correctamente" / "No se pudo…" (como el snackbar del proyecto de
// referencia). Lo muestra <app-snackbar>, que vive en el shell: cualquier página llama a mostrar().
@Injectable({ providedIn: 'root' })
export class SnackbarService {
  readonly aviso = signal<Aviso | null>(null);

  private timer: ReturnType<typeof setTimeout> | undefined;

  mostrar(mensaje: string, tipo: Aviso['tipo'] = 'success'): void {
    clearTimeout(this.timer);
    this.aviso.set({ mensaje, tipo });
    this.timer = setTimeout(() => this.aviso.set(null), 3000);
  }
}
