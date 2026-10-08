import { Component, output } from '@angular/core';

interface Pregunta {
  pregunta: string;
  respuesta: string;
}

// Preguntas frecuentes de ejemplo: se reemplazan por las definitivas cuando el sistema esté
// más desarrollado.
const PREGUNTAS: Pregunta[] = [
  {
    pregunta: '¿Cómo creo un proyecto nuevo?',
    respuesta:
      'Desde el menú, entrá a Proyectos y usá el botón "Nuevo proyecto". Solo pueden hacerlo los roles con permiso para dar de alta proyectos.',
  },
  {
    pregunta: '¿Cómo cambio el estado de una tarea?',
    respuesta:
      'En el tablero de tareas, elegí el nuevo estado en la tarjeta de la tarea. Podés cambiar las tareas que tenés asignadas.',
  },
  {
    pregunta: '¿Por qué no veo algunas opciones del menú?',
    respuesta:
      'Cada rol tiene acceso a ciertas pantallas. Si necesitás ver otra sección, pedile al administrador que revise los permisos de tu rol.',
  },
  {
    pregunta: 'Olvidé mi contraseña, ¿qué hago?',
    respuesta:
      'En la pantalla de inicio de sesión usá "¿Olvidaste tu contraseña?". Te llega un enlace por correo para elegir una nueva.',
  },
  {
    pregunta: '¿Cuánto dura mi sesión?',
    respuesta:
      'Depende de tu rol. Cuando la sesión vence, el sistema te lleva de nuevo al inicio de sesión.',
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
      background: color-mix(in srgb, var(--color-primary) 4%, white);
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
      font-size: 0.9rem;
      line-height: 1.5;
    }
  `,
})
export class FaqDialogComponent {
  protected readonly preguntas = PREGUNTAS;
  readonly cerrar = output<void>();
}
