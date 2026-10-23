import { Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';

// Botón "Filtros" de la cabecera: abre un desplegable con lo que cada pantalla proyecte (checks,
// buscador, montos...). Muestra cuántos filtros hay activos y un "Limpiar" que avisa a la pantalla.
// Para los grupos de checks usar las clases .filtro-grupo / .filtro-check de styles.css.
@Component({
  selector: 'app-panel-filtros',
  standalone: true,
  template: `
    <div class="desplegable">
      <button type="button" class="boton-cabecera" [class.boton-cabecera--activo]="activos() > 0" [attr.aria-expanded]="abierto()" (click)="abierto.set(!abierto())">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4 2v-8z"></path></svg>
        Filtros
        @if (activos() > 0) {
          <span class="boton-cabecera__contador">{{ activos() }}</span>
        }
      </button>
      @if (abierto()) {
        <div class="desplegable__panel desplegable__panel--ancho" role="dialog" aria-label="Filtros">
          <ng-content />
          <div class="desplegable__pie">
            <button type="button" class="link-boton" [disabled]="!activos()" (click)="limpiar.emit()">Limpiar filtros</button>
            <button type="button" class="btn btn--primary btn--chico" (click)="abierto.set(false)">Listo</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class PanelFiltrosComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly activos = input(0);
  readonly limpiar = output<void>();

  protected readonly abierto = signal(false);

  @HostListener('document:click', ['$event'])
  cerrarAfuera(evento: MouseEvent): void {
    if (this.abierto() && !this.host.nativeElement.contains(evento.target as Node)) this.abierto.set(false);
  }
}
