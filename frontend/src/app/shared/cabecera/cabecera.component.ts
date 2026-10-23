import { Component, input } from '@angular/core';

// Cabecera común de todos los paneles: título y subtítulo a la izquierda; a la derecha lo que se
// proyecte (filtro de fechas, botón Filtros, acciones como "Agregar…"). Estilos en styles.css
// (.cabecera-pagina) para que se vea igual en todas las pantallas.
@Component({
  selector: 'app-cabecera',
  standalone: true,
  template: `
    <header class="cabecera-pagina">
      <div class="cabecera-pagina__textos">
        <h1>{{ titulo() }}</h1>
        @if (subtitulo()) {
          <p>{{ subtitulo() }}</p>
        }
      </div>
      <div class="cabecera-pagina__acciones">
        <ng-content />
      </div>
    </header>
  `,
})
export class CabeceraComponent {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string | null>(null);
}
