import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Alerta, DesvioTarea } from '../../core/models/seguimiento.model';
import { semaforoDesvio } from '../../core/utils/seguimiento';

export interface Aviso extends Alerta {
  // En el Portafolio, de qué obra es el aviso (link al proyecto).
  proyecto?: { id: number; nombre: string };
}

// Panel "Avisos" (como "Detección de desvíos" del prototipo): contadores arriba, cada aviso como
// tarjeta con el color de su nivel y un ícono, y las tareas atrasadas con su avance y los días de
// atraso. Sin avisos muestra "Todo en orden". El color siempre va acompañado de texto e ícono.
@Component({
  selector: 'app-avisos',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="panel avisos">
      <div class="avisos__cabecera">
        <h3>Avisos</h3>
        <div class="avisos__conteo">
          @if (criticos()) {
            <span class="conteo conteo--critico">{{ criticos() }} para revisar</span>
          }
          @if (advertencias()) {
            <span class="conteo conteo--riesgo">{{ advertencias() }} de atención</span>
          }
        </div>
      </div>

      <div class="avisos__lista">
        @if (!visibles().length && !desvios().length) {
          <div class="todo-ok">
            <span class="todo-ok__icono" aria-hidden="true">✓</span>
            <div>
              <strong>Todo en orden</strong>
              <p>{{ vacio() }}</p>
            </div>
          </div>
        }
        @for (a of visibles(); track $index) {
          <article class="aviso" [class]="'aviso aviso--' + a.nivel.toLowerCase()">
            <span class="aviso__icono" aria-hidden="true">
              @if (a.nivel === 'INFO') {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5M12 8h.01"></path></svg>
              } @else {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20z"></path><path d="M12 10v4M12 17h.01"></path></svg>
              }
            </span>
            <div class="aviso__texto">
              @if (a.proyecto) {
                <a class="aviso__obra" [routerLink]="['/proyectos', a.proyecto.id]">{{ a.proyecto.nombre }}</a>
              }
              <strong>{{ a.titulo }}</strong>
              <span class="sr-only">({{ a.nivel === 'CRITICA' ? 'para revisar' : a.nivel === 'ADVERTENCIA' ? 'de atención' : 'informativo' }})</span>
              @if (a.detalle) {
                <p>{{ a.detalle }}</p>
              }
            </div>
          </article>
        }

        @if (desvios().length) {
          <div class="atrasadas">
            <div class="atrasadas__titulo">Tareas atrasadas</div>
            @for (d of desvios(); track d.tareaId) {
              <div class="atrasada">
                <div class="atrasada__nombre">
                  <span class="atrasada__num">{{ d.numero }}</span>
                  <span [title]="d.nombre">{{ d.nombre }}</span>
                </div>
                <div class="atrasada__avance" [title]="'Avance ' + d.avance + ' %'">
                  <div [style.width.%]="d.avance"></div>
                </div>
                <span class="atrasada__dias" [class]="'atrasada__dias atrasada__dias--' + (semaforo(d.desvioDias) ?? 'riesgo')">+{{ d.desvioDias }} {{ d.desvioDias === 1 ? 'día' : 'días' }}</span>
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class AvisosComponent {
  readonly alertas = input.required<Aviso[]>();
  readonly desvios = input<DesvioTarea[]>([]);
  readonly vacio = input('No hay atrasos, sobrecostos ni cobros pendientes para revisar.');

  protected readonly semaforo = semaforoDesvio;

  // Los críticos primero.
  protected readonly visibles = computed(() =>
    [...this.alertas()].sort((a, b) => peso(b.nivel) - peso(a.nivel)),
  );
  protected readonly criticos = computed(() => this.alertas().filter((a) => a.nivel === 'CRITICA').length);
  protected readonly advertencias = computed(() => this.alertas().filter((a) => a.nivel === 'ADVERTENCIA').length);
}

function peso(nivel: Alerta['nivel']): number {
  return nivel === 'CRITICA' ? 2 : nivel === 'ADVERTENCIA' ? 1 : 0;
}
