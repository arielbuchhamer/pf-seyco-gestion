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
import { AvisoProyecto, NIVELES_AVISO } from '../core/models/aviso.model';
import { NivelAlerta } from '../core/models/seguimiento.model';
import { AvisosService } from '../core/services/avisos.service';

// Obras que entran en el panel sin scroll; el resto se ve en la pantalla /avisos.
export const MAX_OBRAS_PANEL = 6;

const PESO: Record<NivelAlerta, number> = { CRITICA: 2, ADVERTENCIA: 1, INFO: 0 };

// Resumen de una obra en el panel: su aviso principal (el más importante; a igual nivel, el más
// reciente) y cuántos avisos tiene de cada nivel.
interface ResumenObra {
  proyectoId: number;
  nombre: string;
  principal: AvisoProyecto;
  criticos: number;
  advertencias: number;
  informativos: number;
  nuevo: boolean;
}

// Panel de avisos de la campanita de la barra lateral: un resumen simple, un renglón por obra con
// su aviso principal y los contadores; el detalle completo está en la pantalla /avisos. Lo abre y
// lo cierra la barra (campanita, Esc, clic afuera y navegación). Cada renglón lleva a la solapa de
// la obra donde se resuelve el aviso principal. Al abrirse marca los críticos como vistos (baja el
// globito) y mientras está abierto rotula "Nuevo" las obras con avisos que no se habían visto.
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
          @for (o of visibles(); track o.proyectoId) {
            <li>
              <a
                class="aviso"
                [routerLink]="['/proyectos', o.proyectoId]"
                [queryParams]="{ solapa: o.principal.solapa }"
                (click)="cerrar.emit()"
              >
                <span
                  class="aviso__icono"
                  [class]="'aviso__icono aviso__icono--' + nivel(o.principal.nivel).clase"
                  aria-hidden="true"
                >
                  @switch (o.principal.nivel) {
                    @case ('CRITICA') {
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3z"></path>
                        <path d="M12 8v5M12 16.2v.1"></path>
                      </svg>
                    }
                    @case ('ADVERTENCIA') {
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 3.5 2.5 20h19z"></path>
                        <path d="M12 10v4M12 17v.1"></path>
                      </svg>
                    }
                    @default {
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="9"></circle>
                        <path d="M12 11v5M12 7.9v.1"></path>
                      </svg>
                    }
                  }
                </span>
                <span class="aviso__cuerpo">
                  <span class="aviso__fila">
                    <strong class="aviso__obra">{{ o.nombre }}</strong>
                    @if (o.nuevo) {
                      <span class="nuevo">Nuevo</span>
                    }
                  </span>
                  <span class="aviso__principal">
                    <span class="sr-only">{{ nivel(o.principal.nivel).etiqueta }}: </span>{{ o.principal.titulo }}
                  </span>
                </span>
                <span class="contadores">
                  @if (o.criticos) {
                    <span class="contador contador--revisar" [title]="o.criticos + ' para revisar'">
                      {{ o.criticos }}<span class="sr-only"> para revisar</span>
                    </span>
                  }
                  @if (o.advertencias) {
                    <span class="contador contador--atencion" [title]="o.advertencias + ' de atención'">
                      {{ o.advertencias }}<span class="sr-only"> de atención</span>
                    </span>
                  }
                  @if (o.informativos) {
                    <span class="contador contador--info" [title]="o.informativos + ' informativos'">
                      {{ o.informativos }}<span class="sr-only"> informativos</span>
                    </span>
                  }
                </span>
              </a>
            </li>
          } @empty {
            <li class="vacio">No hay avisos para revisar.</li>
          }
        </ul>
        @if (ocultas()) {
          <p class="mas">y {{ ocultas() }} {{ ocultas() === 1 ? 'obra' : 'obras' }} más con avisos</p>
        }
      }

      <footer class="panel__pie">
        <a routerLink="/avisos">Ver todos los avisos</a>
      </footer>
    </section>
  `,
  styleUrl: './avisos-panel.component.css',
})
export class AvisosPanelComponent {
  // Se emite al elegir una obra: si ya se está en esa misma ruta el router no navega y no habría
  // otra señal para cerrar el panel.
  readonly cerrar = output<void>();

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly avisosSvc = inject(AvisosService);

  // Una entrada por obra, primero las que tienen avisos más graves (y más críticos).
  private readonly obras = computed<ResumenObra[]>(() => {
    const porObra = new Map<number, ResumenObra>();
    for (const a of this.avisosSvc.avisos()) {
      let o = porObra.get(a.proyectoId);
      if (!o) {
        o = { proyectoId: a.proyectoId, nombre: a.proyectoNombre, principal: a, criticos: 0, advertencias: 0, informativos: 0, nuevo: false };
        porObra.set(a.proyectoId, o);
      } else if (masImportante(a, o.principal)) {
        o.principal = a;
      }
      if (a.nivel === 'CRITICA') o.criticos++;
      else if (a.nivel === 'ADVERTENCIA') o.advertencias++;
      else o.informativos++;
      if (this.avisosSvc.esNuevo(a)) o.nuevo = true;
    }
    return [...porObra.values()].sort(
      (a, b) => PESO[b.principal.nivel] - PESO[a.principal.nivel] || b.criticos - a.criticos || b.advertencias - a.advertencias,
    );
  });

  protected readonly visibles = computed(() => this.obras().slice(0, MAX_OBRAS_PANEL));
  protected readonly ocultas = computed(() => Math.max(0, this.obras().length - MAX_OBRAS_PANEL));

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

// El más grave; a igual nivel, el más reciente (los que no tienen fecha quedan como venían).
function masImportante(a: AvisoProyecto, actual: AvisoProyecto): boolean {
  if (PESO[a.nivel] !== PESO[actual.nivel]) return PESO[a.nivel] > PESO[actual.nivel];
  return !!a.fecha && (!actual.fecha || a.fecha > actual.fecha);
}
