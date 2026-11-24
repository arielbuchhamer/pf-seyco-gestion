import { Component, output } from '@angular/core';

interface Pregunta {
  pregunta: string;
  respuesta: string;
}

// Preguntas frecuentes: lo básico para usar el sistema, en pocas líneas.
const PREGUNTAS: Pregunta[] = [
  {
    pregunta: '¿Cómo cargo una obra nueva?',
    respuesta:
      'En Proyectos, arrastrá (o elegí) el Excel del presupuesto, revisá los datos y tocá "Crear proyecto". El sistema arma solo las tareas y el presupuesto de la obra.',
  },
  {
    pregunta: '¿Cómo sé si una obra va atrasada?',
    respuesta:
      'En la solapa Carga de fechas cargá las fechas y fijá la línea base. Después, el Gantt y los Indicadores muestran el desvío de cada tarea: verde en fecha, naranja en riesgo y rojo desviada.',
  },
  {
    pregunta: '¿Dónde cargo los gastos de la obra?',
    respuesta:
      'En la solapa Costos reales. Así podés comparar lo gastado contra lo presupuestado en cada rubro.',
  },
  {
    pregunta: '¿Cómo registro una certificación y su cobro?',
    respuesta:
      'En la solapa Certificaciones usá "Nueva certificación". Cuando el cliente pague, tocá "Registrar cobro". La primera suele ser el anticipo del 30 %.',
  },
  {
    pregunta: '¿Qué significa "actualizado con el índice CAC"?',
    respuesta:
      'Lo que falta cobrar se lleva a valores de hoy según el aumento del índice CAC desde el mes del presupuesto. Si el índice del mes todavía no salió, se usa el del mes anterior. Lo ya cobrado no cambia.',
  },
  {
    pregunta: '¿Qué son los avisos?',
    respuesta:
      'Alertas automáticas cuando una obra se atrasa, gasta más de lo previsto o tiene saldos sin certificar o sin cobrar. Las ves en la campanita y en la pantalla Avisos.',
  },
  {
    pregunta: '¿Cómo cambio mi contraseña?',
    respuesta:
      'Abrí tu usuario (abajo en la barra lateral) y entrá a "Mi perfil". Si la olvidaste, usá "¿Olvidaste tu contraseña?" en el inicio de sesión.',
  },
  {
    pregunta: '¿Por qué no veo algunas opciones del menú?',
    respuesta:
      'Cada rol tiene acceso a ciertas pantallas. Si necesitás otra sección, pedile al administrador que revise los permisos de tu rol.',
  },
];

// Diálogo "Preguntas frecuentes" (menú del usuario en la barra superior).
@Component({
  selector: 'app-faq-dialog',
  standalone: true,
  template: `
    <button type="button" class="backdrop" aria-label="Cerrar" (click)="cerrar.emit()"></button>
    <div class="dialog faq" role="dialog" aria-modal="true" aria-labelledby="faq-titulo">
      <h2 id="faq-titulo">Preguntas frecuentes</h2>
      <div class="faq__lista">
        @for (item of preguntas; track item.pregunta; let primera = $first) {
          <details class="faq__item" [open]="primera">
            <summary>{{ item.pregunta }}</summary>
            <p>{{ item.respuesta }}</p>
          </details>
        }
      </div>
      <div class="dialog__actions">
        <button type="button" class="btn btn--primary" (click)="cerrar.emit()">Cerrar</button>
      </div>
    </div>
  `,
  styles: `
    .faq {
      width: min(34rem, 94vw);
    }
    .faq__lista {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .faq__item {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 0.7rem 0.9rem;
    }
    .faq__item[open] {
      border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
      background: color-mix(in srgb, var(--color-primary) 4%, var(--color-surface));
    }
    summary {
      cursor: pointer;
      font-weight: 600;
      color: var(--color-ink);
    }
    summary:hover {
      color: var(--color-primary);
    }
    .faq__item p {
      margin: 0.5rem 0 0;
      color: var(--color-text);
      font-size: var(--texto-cuerpo);
      line-height: 1.5;
    }
  `,
})
export class FaqDialogComponent {
  protected readonly preguntas = PREGUNTAS;
  readonly cerrar = output<void>();
}
