import { Component, input } from '@angular/core';
import { Previsualizacion } from '../../core/models/presupuesto.model';
import { pesosCorto } from '../../core/utils/formato';

// Cards "Se va a crear" (cantidades y total) y "Verificación automática" de la previsualización.
@Component({
  selector: 'app-resumen-importacion',
  standalone: true,
  template: `
    <div class="resumen">
      <section class="panel">
        <h2 class="panel__titulo">{{ creado() ? 'Se creó' : 'Se va a crear' }}</h2>
        <div class="cifras">
          <div class="cifra">
            <strong>{{ datos().cantidadTareas }}</strong>
            <span>tareas <em>(capítulos del Excel)</em></span>
          </div>
          <div class="cifra">
            <strong>{{ datos().cantidadSubtareas }}</strong>
            <span>subtareas <em>(grupos)</em></span>
          </div>
          <div class="cifra">
            <strong>{{ datos().cantidadItems }}</strong>
            <span>ítems de presupuesto</span>
          </div>
          <div class="cifra">
            <strong class="num">{{ pesosCorto(datos().totales.total) }}</strong>
            <span>total sin IVA</span>
          </div>
        </div>
        <p class="nota">
          Las tareas y subtareas se crean <strong>pendientes</strong>, sin responsable y con las fechas del
          proyecto. Las fechas se ajustan después en la solapa Tareas.
        </p>
      </section>

      <section class="panel">
        <h2 class="panel__titulo">Verificación automática</h2>
        <ul class="checks">
          @for (v of datos().verificaciones; track $index) {
            <li [class]="'check check--' + v.nivel.toLowerCase()">
              <span class="check__icono" aria-hidden="true">{{ v.nivel === 'OK' ? '✓' : v.nivel === 'ERROR' ? '✕' : '!' }}</span>
              <span>
                <span class="sr-only">{{ v.nivel === 'OK' ? 'Correcto:' : v.nivel === 'ERROR' ? 'Error:' : 'Advertencia:' }}</span>
                {{ v.titulo }}
                @if (v.detalle) {
                  <small>{{ v.detalle }}</small>
                }
              </span>
            </li>
          }
        </ul>
      </section>
    </div>
  `,
  styles: `
    .resumen {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 21rem), 1fr));
      gap: 1rem;
    }
    .cifras {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }
    .cifra {
      border: 1px solid var(--color-border);
      border-radius: 10px;
      padding: 0.75rem 0.9rem;
      display: flex;
      flex-direction: column;
    }
    .cifra strong {
      font-size: 1.5rem;
      color: var(--color-ink);
      text-align: left;
    }
    .cifra span, .nota {
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }
    .cifra em {
      font-style: normal;
      color: #9aa1ad;
    }
    .nota {
      margin: 0.9rem 0 0;
    }
    .nota strong {
      color: var(--color-text);
    }
    .checks {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      font-size: 0.875rem;
    }
    .check {
      display: flex;
      gap: 0.6rem;
    }
    .check__icono {
      font-weight: 700;
      width: 1rem;
      flex: none;
    }
    .check--ok .check__icono { color: var(--color-success); }
    .check--advertencia .check__icono { color: #b4690e; }
    .check--error { color: var(--color-danger); }
    .check small {
      display: block;
      color: var(--color-text-muted);
    }
  `,
})
export class ResumenImportacionComponent {
  readonly datos = input.required<Previsualizacion>();
  readonly creado = input(false);

  protected readonly pesosCorto = pesosCorto;
}
