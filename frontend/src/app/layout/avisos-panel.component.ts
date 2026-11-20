import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NIVELES_AVISO } from '../core/models/aviso.model';
import { NivelAlerta } from '../core/models/seguimiento.model';
import { AvisosService } from '../core/services/avisos.service';

export const MAX_AVISOS_PANEL = 8;

// Panel de avisos de la campanita de la barra lateral. Lo abre y lo cierra la barra (campanita,
// Esc, clic afuera y navegación). Muestra los primeros avisos (los críticos van primero) y cada
// uno lleva a la solapa de su obra donde se resuelve; el resto está en la pantalla /avisos.
// Al abrirse marca los críticos como vistos (baja el globito) y mientras está abierto rotula
// "Nuevo" los que no se habían visto.
@Component({
  selector: 'app-avisos-panel',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="panel" role="dialog" aria-label="Avisos" tabindex="-1">
      <header class="panel__cabecera">
        <h2>Avisos</h2>
        @if (avisosSvc.totales(); as t) {
          <p>{{ t.criticos }} para revisar · {{ t.advertencias }} de atención</p>
        }
      </header>

      @if (avisosSvc.error() && !avisosSvc.totales()) {
        <div class="estado" role="alert">
          <p>No se pudieron cargar los avisos.</p>
          <button type="button" class="reintentar" (click)="avisosSvc.recargar(true)">
            Reintentar
          </button>
        </div>
      } @else if (!avisosSvc.totales()) {
        <p class="estado" role="status">Cargando avisos…</p>
      } @else {
        @if (avisosSvc.error()) {
          <p class="aviso-error" role="alert">
            No se pudieron actualizar; se muestran los últimos.
          </p>
        }
        <ul class="lista">
          @for (a of visibles(); track $index) {
            <li>
              <a
                class="aviso"
                [routerLink]="['/proyectos', a.proyectoId]"
                [queryParams]="{ solapa: a.solapa }"
                (click)="cerrar.emit()"
              >
                <span
                  class="aviso__icono"
                  [class]="'aviso__icono aviso__icono--' + nivel(a.nivel).clase"
                  aria-hidden="true"
                >
                  @switch (a.nivel) {
                    @case ('CRITICA') {
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3z"></path>
                        <path d="M12 8v5M12 16.2v.1"></path>
                      </svg>
                    }
                    @case ('ADVERTENCIA') {
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M12 3.5 2.5 20h19z"></path>
                        <path d="M12 10v4M12 17v.1"></path>
                      </svg>
                    }
                    @default {
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <circle cx="12" cy="12" r="9"></circle>
                        <path d="M12 11v5M12 7.9v.1"></path>
                      </svg>
                    }
                  }
                </span>
                <span class="aviso__cuerpo">
                  <span [class]="'chip chip--' + nivel(a.nivel).clase">{{
                    nivel(a.nivel).etiqueta
                  }}</span>
                  @if (avisosSvc.esNuevo(a)) {
                    <span class="chip chip--nuevo">Nuevo</span>
                  }
                  <strong>{{ a.titulo }}</strong>
                  @if (a.detalle) {
                    <span class="aviso__detalle">{{ a.detalle }}</span>
                  }
                  <span class="aviso__obra">{{ a.proyectoNombre }}</span>
                </span>
              </a>
            </li>
          } @empty {
            <li class="vacio">No hay avisos para revisar.</li>
          }
        </ul>
      }

      <footer class="panel__pie">
        <a routerLink="/avisos">Ver todos los avisos</a>
      </footer>
    </section>
  `,
  styleUrl: './avisos-panel.component.css',
})
export class AvisosPanelComponent {
  // Se emite al elegir un aviso: si ya se está en esa misma ruta el router no navega y no habría
  // otra señal para cerrar el panel.
  readonly cerrar = output<void>();

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly avisosSvc = inject(AvisosService);

  protected readonly visibles = computed(() => this.avisosSvc.avisos().slice(0, MAX_AVISOS_PANEL));

  protected readonly nivel = (n: NivelAlerta) => NIVELES_AVISO[n];

  constructor() {
    this.avisosSvc.abrirPanel();
    inject(DestroyRef).onDestroy(() => this.avisosSvc.cerrarPanel());
    this.avisosSvc.recargar();
    afterNextRender(() =>
      this.elemento.nativeElement.querySelector<HTMLElement>('[role="dialog"]')?.focus(),
    );
  }
}
