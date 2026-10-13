import { Component, input } from '@angular/core';
import { PresupuestoDetalle } from '../../core/models/presupuesto.model';
import { DistribucionRubrosComponent } from '../../shared/presupuesto/distribucion-rubros.component';
import { PresupuestoTablaComponent } from '../../shared/presupuesto/presupuesto-tabla.component';

// Solapa Presupuesto: distribución por rubro y el detalle jerárquico con buscador.
// (El Excel original es del proyecto: se descarga desde el encabezado.)
@Component({
  selector: 'app-proyecto-presupuesto',
  standalone: true,
  imports: [DistribucionRubrosComponent, PresupuestoTablaComponent],
  template: `
    <app-distribucion-rubros [totales]="presupuesto().totales" />
    <app-presupuesto-tabla
      titulo="Detalle del presupuesto"
      subtitulo="Tarea › subtarea › armado › ítem"
      [items]="presupuesto().items"
      [totales]="presupuesto().totales"
      [conBuscador]="true"
      [abrir]="abrir()"
    />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
  `,
})
export class ProyectoPresupuestoComponent {
  readonly presupuesto = input.required<PresupuestoDetalle>();
  readonly abrir = input<string[] | null>(null);
}
