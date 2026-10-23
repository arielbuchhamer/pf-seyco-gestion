import { Component, computed, input, output, signal } from '@angular/core';
import { Previsualizacion } from '../../core/models/presupuesto.model';
import { fecha, pesosCorto } from '../../core/utils/formato';

// Card "Importar proyecto" (columna angosta de la pantalla Proyectos): zona chica para arrastrar
// o elegir el Excel. Apenas se elige, la pantalla lo lee y acá se muestran los datos detectados
// (obra, cliente, plazo, total...) con el botón "Revisar": el proyecto se crea sólo desde la
// revisión, para que siempre se chequeen los datos antes de guardar.
@Component({
  selector: 'app-zona-carga',
  standalone: true,
  templateUrl: './zona-carga.component.html',
  styleUrl: './zona-carga.component.css',
})
export class ZonaCargaComponent {
  readonly archivo = input<File | null>(null);
  // Lo que se leyó del Excel (null mientras no hay archivo o se está leyendo).
  readonly lectura = input<Previsualizacion | null>(null);
  readonly leyendo = input(false);
  readonly error = input<string | null>(null);

  readonly elegir = output<File>();
  readonly quitar = output<void>();
  readonly revisar = output<void>();

  protected readonly arrastrando = signal(false);
  protected readonly fecha = fecha;
  protected readonly pesosCorto = pesosCorto;

  protected readonly avisos = computed(() => {
    const v = this.lectura()?.verificaciones ?? [];
    return { errores: v.filter((x) => x.nivel === 'ERROR').length, advertencias: v.filter((x) => x.nivel === 'ADVERTENCIA').length };
  });

  onArrastre(event: DragEvent, encima: boolean): void {
    event.preventDefault();
    this.arrastrando.set(encima);
  }

  onSoltar(event: DragEvent): void {
    event.preventDefault();
    this.arrastrando.set(false);
    const archivo = event.dataTransfer?.files?.[0];
    if (archivo && !this.leyendo()) this.elegir.emit(archivo);
  }

  onElegir(selector: HTMLInputElement): void {
    const archivo = selector.files?.[0];
    if (archivo) this.elegir.emit(archivo);
    // Permite volver a elegir el mismo archivo después de quitarlo.
    selector.value = '';
  }
}
