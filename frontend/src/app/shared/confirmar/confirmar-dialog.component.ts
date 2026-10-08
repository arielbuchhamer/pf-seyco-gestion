import { Component, input, output } from '@angular/core';

// Diálogo "¿Desea eliminar el <tipo> <nombre>?" con Cancelar / Eliminar (como en el proyecto de
// referencia), con las clases .dialog/.backdrop de styles.css. Se muestra con un @if en la página.
@Component({
  selector: 'app-confirmar-dialog',
  standalone: true,
  template: `
    <button type="button" class="backdrop" aria-label="Cerrar" (click)="cancelar.emit()"></button>
    <div class="dialog" role="alertdialog" aria-modal="true">
      <h2>{{ titulo() }}</h2>
      <p class="mensaje">
        {{ pregunta() }} <strong>{{ nombre() }}</strong>?
      </p>
      <div class="dialog__actions">
        <button type="button" class="btn btn--ghost" (click)="cancelar.emit()">Cancelar</button>
        <button type="button" class="btn btn--danger" [disabled]="procesando()" (click)="confirmar.emit()">
          {{ procesando() ? 'Eliminando…' : 'Eliminar' }}
        </button>
      </div>
    </div>
  `,
  styles: `
    .mensaje {
      margin: 0 0 1rem;
      line-height: 1.5;
    }
  `,
})
export class ConfirmarDialogComponent {
  readonly titulo = input.required<string>();
  // Texto antes del nombre, ej. "¿Desea eliminar el usuario".
  readonly pregunta = input.required<string>();
  readonly nombre = input.required<string>();
  readonly procesando = input(false);

  readonly confirmar = output<void>();
  readonly cancelar = output<void>();
}
