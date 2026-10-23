import { Component, input } from '@angular/core';
import { Alerta } from '../../core/models/seguimiento.model';

// Alertas del seguimiento (atrasos, rubros excedidos, saldos sin certificar o sin cobrar).
// Cada nivel lleva ícono y texto además del color. Estilos .alerta* en styles.css.
@Component({
  selector: 'app-lista-alertas',
  standalone: true,
  template: `
    <ul class="alertas">
      @for (a of alertas(); track a.titulo) {
        <li class="alerta" [class]="'alerta alerta--' + a.nivel.toLowerCase()">
          <span class="alerta__icono" aria-hidden="true">{{ a.nivel === 'INFO' ? 'i' : '!' }}</span>
          <div>
            <strong>{{ a.titulo }}</strong>
            <span class="sr-only"> ({{ a.nivel === 'CRITICA' ? 'crítica' : a.nivel === 'ADVERTENCIA' ? 'advertencia' : 'información' }})</span>
            @if (a.detalle) {
              <div class="alerta__detalle">{{ a.detalle }}</div>
            }
          </div>
        </li>
      } @empty {
        <li class="muted">{{ vacio() }}</li>
      }
    </ul>
  `,
})
export class ListaAlertasComponent {
  readonly alertas = input.required<Alerta[]>();
  readonly vacio = input('Sin alertas: la obra va según lo previsto.');
}
