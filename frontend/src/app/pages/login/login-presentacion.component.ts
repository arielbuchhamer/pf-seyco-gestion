import { Component, inject } from '@angular/core';
import { TemaService } from '../../core/services/tema.service';

interface Funcion {
  titulo: string;
  detalle: string;
  icono: string; // path de un SVG 24x24 (trazo)
  color: string;
}

// Qué hace la app, en palabras simples (el detalle aparece al pasar el mouse o al enfocarlas).
const FUNCIONES: Funcion[] = [
  {
    titulo: 'Importá desde Excel',
    detalle: 'Subís la planilla de presupuesto y la obra queda armada con sus tareas y rubros.',
    icono: 'M4 4h16v16H4zM4 10h16M10 4v16',
    color: '#1f9d55',
  },
  {
    titulo: 'Avance y costos',
    detalle: 'Plan contra real y gastos contra lo cotizado: ves al instante si la obra va bien.',
    icono: 'M3 20h18M5 16l4-5 4 3 6-8',
    color: '#0f5fa6',
  },
  {
    titulo: 'Cobranzas al día',
    detalle: 'Anticipo, certificados y cobros: ningún saldo de obra queda sin cobrar.',
    icono: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
    color: '#c8790f',
  },
  {
    titulo: 'Avisos y reportes',
    detalle: 'Atrasos y sobrecostos te aparecen solos, con portafolio y reportes para decidir.',
    icono: 'M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16zM10 21h4',
    color: '#c43c33',
  },
];

// Lado izquierdo del login: presentación de Proxel (logo, subtítulo, qué hace y para qué sirve).
// Es una app interna: no vende nada, sólo cuenta para qué sirve antes de ingresar. En pantallas
// angostas no se muestra (queda sólo el login).
@Component({
  selector: 'app-login-presentacion',
  standalone: true,
  template: `
    <div class="contenido">
      <img class="logo" [src]="tema() === 'oscuro' ? 'assets/img/proxel-logo-blanco.png' : 'assets/img/proxel-logo.png'" alt="Proxel - Proyectos y obras" width="232" height="64" />
      <h2 class="subtitulo">Sistema de gestión de <span>obras</span></h2>
      <p class="bajada">
        Importá el presupuesto, seguí el avance y los costos de cada obra, y que no se te escape ningún cobro.
        Todo en un solo lugar.
      </p>

      <ul class="funciones">
        @for (f of funciones; track f.titulo) {
          <li class="funcion" tabindex="0" [style.--tono]="f.color" [attr.aria-label]="f.titulo + ': ' + f.detalle">
            <span class="funcion__icono" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"
                stroke-linecap="round" stroke-linejoin="round"><path [attr.d]="f.icono" /></svg>
            </span>
            <strong>{{ f.titulo }}</strong>
            <span class="funcion__detalle" aria-hidden="true">{{ f.detalle }}</span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    :host {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem clamp(1.5rem, 4vw, 4rem);
      overflow: hidden;
    }
    .contenido {
      position: relative;
      z-index: 1;
      max-width: 44rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      animation: entrar 0.6s ease-out;
    }
    /* Halo blanco detrás del texto: los cuadrados del fondo se desvanecen donde hay que leer. */
    .contenido::before {
      content: '';
      position: absolute;
      inset: -3rem -4rem;
      z-index: -1;
      background: radial-gradient(closest-side, rgba(248, 251, 255, 0.95), rgba(248, 251, 255, 0.75) 60%, transparent);
      pointer-events: none;
    }
    .logo {
      width: 19rem;
      height: auto;
    }
    /* Subtítulo bajo el logo, con una línea fina de acento debajo. */
    .subtitulo {
      margin: 2rem 0 2rem;
      font-size: 1.45rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: #0f172a;
    }
    .subtitulo span {
      color: #1d4ed8;
    }
    .subtitulo::after {
      content: '';
      display: block;
      width: 3rem;
      height: 3px;
      margin: 1rem auto 0;
      border-radius: 999px;
      background: linear-gradient(90deg, #1d4ed8, #1f9d55);
    }
    .bajada {
      max-width: 32rem;
      margin: 0 0 3rem;
      font-size: var(--texto-titulo);
      line-height: 1.6;
      color: #4b5563;
    }
    .funciones {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.75rem;
      width: 100%;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .funcion {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      min-height: 8.5rem;
      padding: 1rem 0.6rem;
      border: 1px solid #dfe7f3;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 8px 20px -14px rgba(15, 40, 90, 0.4);
      color: #0f172a;
      font-size: var(--texto-cuerpo);
      line-height: 1.25;
      overflow: hidden;
      cursor: default;
      outline: none;
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }
    .funcion__icono {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.6rem;
      height: 2.6rem;
      border-radius: 12px;
      background: var(--tono);
      color: #fff;
    }
    /* El detalle cubre la tarjeta al pasar el mouse o al enfocarla. */
    .funcion__detalle {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.8rem;
      background: var(--tono);
      color: #fff;
      font-size: var(--texto-secundario);
      font-weight: 500;
      line-height: 1.4;
      opacity: 0;
      transform: translateY(12px);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .funcion:hover,
    .funcion:focus-visible {
      transform: translateY(-3px);
      border-color: var(--tono);
      box-shadow: 0 14px 26px -14px color-mix(in srgb, var(--tono) 80%, transparent);
    }
    .funcion:hover .funcion__detalle,
    .funcion:focus-visible .funcion__detalle {
      opacity: 1;
      transform: none;
    }
    /* Modo oscuro: halo azul noche, textos claros y tarjetas oscuras. */
    :host-context([data-tema='oscuro']) .contenido::before {
      background: radial-gradient(closest-side, rgba(14, 21, 34, 0.95), rgba(14, 21, 34, 0.75) 60%, transparent);
    }
    :host-context([data-tema='oscuro']) .subtitulo { color: #eef2f8; }
    :host-context([data-tema='oscuro']) .subtitulo span { color: #8cc0f2; }
    :host-context([data-tema='oscuro']) .bajada { color: #b4bfd0; }
    :host-context([data-tema='oscuro']) .funcion {
      border-color: #2a3650;
      background: rgba(23, 33, 51, 0.92);
      color: #eef2f8;
      box-shadow: 0 8px 20px -14px rgba(0, 0, 0, 0.7);
    }
    @keyframes entrar {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .contenido {
        animation: none;
      }
    }
    /* Pantallas bajas: un poco menos de aire para que todo entre sin scroll. */
    @media (max-height: 760px) {
      .subtitulo { margin: 1.25rem 0 1.25rem; }
      .bajada { margin-bottom: 1.75rem; }
    }
    @media (max-width: 1100px) {
      .funciones {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .funcion {
        min-height: 7rem;
      }
    }
  `,
})
export class LoginPresentacionComponent {
  protected readonly tema = inject(TemaService).tema;
  protected readonly funciones = FUNCIONES;
}
