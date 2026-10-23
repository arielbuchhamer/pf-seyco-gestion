import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { Component, computed, input } from '@angular/core';
import { Indicadores } from '../../core/models/seguimiento.model';
import { extraerMensajeError } from '../../core/utils/http-error';
import { TableroProyectoComponent } from '../../shared/tablero/tablero-proyecto.component';

// Solapa "Indicadores": tablero de KPIs del proyecto (proyectado vs. real) calculado por
// GET /api/proyectos/{id}/indicadores (ver IndicadoresService en el backend).
@Component({
  selector: 'app-proyecto-indicadores',
  standalone: true,
  imports: [TableroProyectoComponent],
  template: `
    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    } @else if (recurso.value(); as i) {
      <app-tablero-proyecto [indicadores]="i" />
    } @else {
      <p class="muted">Calculando indicadores…</p>
    }
  `,
})
export class ProyectoIndicadoresComponent {
  readonly proyectoId = input.required<number>();

  protected readonly recurso = httpResource<Indicadores>(() => `/api/proyectos/${this.proyectoId()}/indicadores`);

  // Un 404 sin mensaje es un backend anterior a los indicadores (hay que reiniciarlo).
  protected readonly error = computed(() => {
    const err = this.recurso.error();
    if (!err) return null;
    if (err instanceof HttpErrorResponse && err.status === 404 && !err.error?.message) {
      return 'El backend no tiene el cálculo de indicadores: reinicialo para tomar la versión nueva.';
    }
    return extraerMensajeError(err, 'No se pudieron calcular los indicadores.');
  });
}
