import { Component, computed, input } from '@angular/core';
import { SITUACIONES, SITUACION_LABEL, Situacion } from './situacion';

// Barra de la pantalla Tareas con cuántas subtareas del proyecto hay en cada situación (en fecha,
// en riesgo, desviada, sin estimar). Va en el renglón del selector de proyecto, a la derecha.
// Sin línea base (porSituacion = null) no hay desvío que medir: sólo lo avisa.
@Component({
  selector: 'app-tareas-situacion',
  standalone: true,
  template: `
    <span class="titulo">Situación de las subtareas</span>
    @if (porSituacion(); as ps) {
      <div class="segmentos" role="img" [attr.aria-label]="texto()">
        @for (s of situaciones; track s) {
          @if (ps[s]) {
            <span class="segmento" [class]="'segmento color--' + s" [style.flex-grow]="ps[s]" [title]="situacionLabel[s] + ': ' + ps[s]"></span>
          }
        }
      </div>
      <div class="leyenda">
        @for (s of situaciones; track s) {
          <span class="leyenda__item"><span class="punto" [class]="'punto color--' + s"></span>{{ situacionLabel[s] }} {{ ps[s] }}</span>
        }
      </div>
    } @else {
      <span class="aviso">Se calcula al fijar la línea base</span>
    }
  `,
  styleUrl: './tareas-situacion.component.css',
})
export class TareasSituacionComponent {
  readonly porSituacion = input<Record<Situacion, number> | null>(null);

  protected readonly situaciones = SITUACIONES;
  protected readonly situacionLabel = SITUACION_LABEL;

  protected readonly texto = computed(() => {
    const ps = this.porSituacion();
    return ps ? SITUACIONES.map((s) => `${SITUACION_LABEL[s]}: ${ps[s]}`).join(', ') : '';
  });
}
