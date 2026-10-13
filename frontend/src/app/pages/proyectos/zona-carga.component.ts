import { Component, input, output, signal } from '@angular/core';

export type AccionCarga = 'revisar' | 'crear';

// Card "Alta automática de proyecto": zona para arrastrar o elegir el archivo (sólo lo carga,
// no lo lee) y los tres botones Subir / Revisar / Crear proyecto. Revisar muestra la
// previsualización antes de guardar; Crear proyecto lo crea directo con los datos del Excel.
@Component({
  selector: 'app-zona-carga',
  standalone: true,
  templateUrl: './zona-carga.component.html',
  styleUrl: './zona-carga.component.css',
})
export class ZonaCargaComponent {
  readonly archivo = input<File | null>(null);
  // Acción en curso (deshabilita los botones y muestra "Leyendo…"/"Creando…").
  readonly ocupado = input<AccionCarga | null>(null);
  readonly error = input<string | null>(null);

  readonly elegir = output<File>();
  readonly quitar = output<void>();
  readonly revisar = output<void>();
  readonly crear = output<void>();

  protected readonly arrastrando = signal(false);

  onArrastre(event: DragEvent, encima: boolean): void {
    event.preventDefault();
    this.arrastrando.set(encima);
  }

  onSoltar(event: DragEvent): void {
    event.preventDefault();
    this.arrastrando.set(false);
    const archivo = event.dataTransfer?.files?.[0];
    if (archivo && !this.ocupado()) this.elegir.emit(archivo);
  }

  onElegir(selector: HTMLInputElement): void {
    const archivo = selector.files?.[0];
    if (archivo) this.elegir.emit(archivo);
    // Permite volver a elegir el mismo archivo después de quitarlo.
    selector.value = '';
  }

  protected tamanio(archivo: File): string {
    return archivo.size < 1024 * 1024
      ? `${Math.max(1, Math.round(archivo.size / 1024))} KB`
      : `${(archivo.size / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
  }
}
