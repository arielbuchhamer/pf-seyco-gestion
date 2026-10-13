import { Component, computed, effect, input, signal } from '@angular/core';
import { NodoPresupuesto, TotalesRubro } from '../../core/models/presupuesto.model';
import { numero, pesos } from '../../core/utils/formato';

interface Fila {
  nodo: NodoPresupuesto;
  nivel: number;
  tieneHijos: boolean;
  abierto: boolean;
}

// Tabla jerárquica del presupuesto (capítulo › grupo › armado › ítem), expandible, con las
// columnas por rubro opcionales. La usan la previsualización de la importación y la solapa
// Presupuesto del proyecto. Por defecto se ven capítulos y grupos.
@Component({
  selector: 'app-presupuesto-tabla',
  standalone: true,
  templateUrl: './presupuesto-tabla.component.html',
  styleUrl: './presupuesto-tabla.component.css',
})
export class PresupuestoTablaComponent {
  readonly titulo = input.required<string>();
  readonly subtitulo = input('');
  readonly items = input.required<NodoPresupuesto[]>();
  readonly totales = input.required<TotalesRubro>();
  // Pastillas "Tarea"/"Subtarea" en capítulos y grupos (en la previsualización).
  readonly conRoles = input(false);
  readonly conBuscador = input(false);
  // Números de nodo a dejar abiertos (ej. al llegar desde el monto de una tarea).
  readonly abrir = input<string[] | null>(null);

  protected readonly pesos = pesos;
  protected readonly numero = numero;

  protected readonly abiertos = signal<Set<string>>(new Set());
  protected readonly conRubros = signal(true);
  protected readonly busqueda = signal('');

  constructor() {
    effect(() => {
      const abrir = this.abrir();
      const capitulos = this.items().map((n) => n.numero);
      this.abiertos.set(new Set(abrir?.length ? abrir : capitulos));
    });
  }

  private readonly coincidencias = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    if (!q) return null;
    // Nodos que coinciden y todos sus ancestros: se muestran abiertos.
    const visibles = new Set<string>();
    const recorrer = (nodo: NodoPresupuesto, camino: string[]): void => {
      const texto = `${nodo.descripcion ?? ''} ${nodo.codigo ?? ''}`.toLowerCase();
      if (texto.includes(q)) {
        [...camino, nodo.numero].forEach((n) => visibles.add(n));
      }
      nodo.hijos.forEach((h) => recorrer(h, [...camino, nodo.numero]));
    };
    this.items().forEach((n) => recorrer(n, []));
    return visibles;
  });

  protected readonly filas = computed<Fila[]>(() => {
    const abiertos = this.abiertos();
    const coincidencias = this.coincidencias();
    const filas: Fila[] = [];
    const recorrer = (nodo: NodoPresupuesto, nivel: number): void => {
      if (coincidencias && !coincidencias.has(nodo.numero)) return;
      const abierto = coincidencias ? true : abiertos.has(nodo.numero);
      filas.push({ nodo, nivel, tieneHijos: nodo.hijos.length > 0, abierto });
      if (abierto) nodo.hijos.forEach((h) => recorrer(h, nivel + 1));
    };
    this.items().forEach((n) => recorrer(n, 0));
    return filas;
  });

  alternar(numero: string): void {
    this.abiertos.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(numero)) nuevo.delete(numero);
      else nuevo.add(numero);
      return nuevo;
    });
  }

  expandirTodo(): void {
    const todos = new Set<string>();
    const recorrer = (n: NodoPresupuesto): void => {
      if (n.hijos.length) todos.add(n.numero);
      n.hijos.forEach(recorrer);
    };
    this.items().forEach(recorrer);
    this.abiertos.set(todos);
  }

  contraerTodo(): void {
    this.abiertos.set(new Set());
  }
}
