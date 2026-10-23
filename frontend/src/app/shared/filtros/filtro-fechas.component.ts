import { Component, ElementRef, HostListener, computed, inject, input, model, signal } from '@angular/core';
import { fecha, hoy, sumarDias } from '../../core/utils/formato';

// Filtro de fechas de la cabecera: un botón con calendario que muestra el rango elegido y abre un
// desplegable con atajos (este mes, últimos 3 meses, este año) y "desde / hasta" con el
// calendario del navegador. desde/hasta son fechas ISO ('' = sin límite), con two-way binding.
@Component({
  selector: 'app-filtro-fechas',
  standalone: true,
  template: `
    <div class="desplegable">
      <button type="button" class="boton-cabecera" [class.boton-cabecera--activo]="activo()" [attr.aria-expanded]="abierto()" (click)="abierto.set(!abierto())">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"></rect><path d="M3.5 10h17M8 3v4M16 3v4"></path></svg>
        {{ texto() }}
        @if (activo()) {
          <span class="boton-cabecera__quitar" role="button" tabindex="0" aria-label="Quitar filtro de fechas" (click)="limpiar($event)" (keydown.enter)="limpiar($event)">×</span>
        }
      </button>
      @if (abierto()) {
        <div class="desplegable__panel" role="dialog" aria-label="Filtrar por fechas">
          <div class="desplegable__titulo">{{ etiqueta() }}</div>
          <div class="atajos">
            @for (a of atajos; track a.texto) {
              <button type="button" class="atajo" (click)="elegir(a.desde(), a.hasta())">{{ a.texto }}</button>
            }
          </div>
          <div class="rango-fechas">
            <label>Desde<input type="date" [value]="desde()" [max]="hasta() || null" (change)="desde.set($any($event.target).value)" /></label>
            <label>Hasta<input type="date" [value]="hasta()" [min]="desde() || null" (change)="hasta.set($any($event.target).value)" /></label>
          </div>
          <div class="desplegable__pie">
            <button type="button" class="link-boton" (click)="elegir('', '')">Todas las fechas</button>
            <button type="button" class="btn btn--primary btn--chico" (click)="abierto.set(false)">Listo</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class FiltroFechasComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly desde = model('');
  readonly hasta = model('');

  // Qué fecha se filtra (título del desplegable).
  readonly etiqueta = input('Fecha de inicio de la obra');
  protected readonly abierto = signal(false);
  protected readonly activo = computed(() => !!(this.desde() || this.hasta()));

  protected readonly texto = computed(() => {
    const d = this.desde();
    const h = this.hasta();
    if (d && h) return `${fecha(d)} – ${fecha(h)}`;
    if (d) return `Desde ${fecha(d)}`;
    if (h) return `Hasta ${fecha(h)}`;
    return 'Todas las fechas';
  });

  protected readonly atajos = [
    { texto: 'Este mes', desde: () => hoy().slice(0, 8) + '01', hasta: () => '' },
    { texto: 'Últimos 3 meses', desde: () => sumarDias(hoy(), -90), hasta: () => '' },
    { texto: 'Este año', desde: () => hoy().slice(0, 4) + '-01-01', hasta: () => hoy().slice(0, 4) + '-12-31' },
    { texto: 'Año pasado', desde: () => `${Number(hoy().slice(0, 4)) - 1}-01-01`, hasta: () => `${Number(hoy().slice(0, 4)) - 1}-12-31` },
  ];

  elegir(desde: string, hasta: string): void {
    this.desde.set(desde);
    this.hasta.set(hasta);
    this.abierto.set(false);
  }

  limpiar(evento: Event): void {
    evento.stopPropagation();
    this.elegir('', '');
  }

  @HostListener('document:click', ['$event'])
  cerrarAfuera(evento: MouseEvent): void {
    if (this.abierto() && !this.host.nativeElement.contains(evento.target as Node)) this.abierto.set(false);
  }
}
