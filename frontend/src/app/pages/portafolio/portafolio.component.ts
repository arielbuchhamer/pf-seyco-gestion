import { httpResource } from '@angular/common/http';
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ESTADOS_PROYECTO,
  ESTADO_PROYECTO_LABEL,
  EstadoProyecto,
  TIPOS_CLIENTE,
  TIPOS_OBRA,
  TIPO_CLIENTE_LABEL,
  TIPO_OBRA_LABEL,
  TipoCliente,
  TipoObra,
} from '../../core/models/proyecto.model';
import { Indicadores, Portafolio, ResumenProyecto } from '../../core/models/seguimiento.model';
import { numero, pesosCorto } from '../../core/utils/formato';
import { Semaforo, alternar, semaforoDesvio } from '../../core/utils/seguimiento';
import { AvisosComponent, Aviso } from '../../shared/alertas/avisos.component';
import { CabeceraComponent } from '../../shared/cabecera/cabecera.component';
import { ColumnasComponent } from '../../shared/graficos/columnas.component';
import { FiltroFechasComponent } from '../../shared/filtros/filtro-fechas.component';
import { PanelFiltrosComponent } from '../../shared/filtros/panel-filtros.component';
import { KpiComponent } from '../../shared/kpi/kpi.component';
import { TableroProyectoComponent } from '../../shared/tablero/tablero-proyecto.component';

// Portafolio (Gestión global), en lenguaje simple: cuántas obras hay, cuánto se presupuestó,
// cuánto se gastó y cuánto falta cobrar; el listado de obras con cómo viene cada una y los avisos.
// Con un solo proyecto en el filtro muestra el tablero de ese proyecto.
// Filtros: fechas (inicio de la obra) y el panel "Filtros" (cliente, tipo de obra, estado, monto).
@Component({
  selector: 'app-portafolio',
  standalone: true,
  imports: [
    RouterLink,
    CabeceraComponent,
    FiltroFechasComponent,
    PanelFiltrosComponent,
    KpiComponent,
    TableroProyectoComponent,
    AvisosComponent,
    ColumnasComponent,
  ],
  templateUrl: './portafolio.component.html',
  styleUrl: './portafolio.component.css',
})
export class PortafolioComponent {
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly clientes = signal<TipoCliente[]>([]);
  protected readonly obras = signal<TipoObra[]>([]);
  protected readonly estados = signal<EstadoProyecto[]>([]);
  // En millones de pesos (más cómodo que tipear el monto completo).
  protected readonly montoMin = signal('');
  protected readonly montoMax = signal('');

  protected readonly recurso = httpResource<Portafolio>(() => {
    const params: Record<string, string | string[]> = {};
    if (this.desde()) params['desde'] = this.desde();
    if (this.hasta()) params['hasta'] = this.hasta();
    if (this.clientes().length) params['tipoCliente'] = this.clientes();
    if (this.obras().length) params['tipoObra'] = this.obras();
    if (this.estados().length) params['estado'] = this.estados();
    if (this.montoMin()) params['montoMin'] = String(Number(this.montoMin()) * 1_000_000);
    if (this.montoMax()) params['montoMax'] = String(Number(this.montoMax()) * 1_000_000);
    return { url: '/api/portafolio', params };
  });

  protected readonly proyectos = computed(() => this.recurso.value()?.proyectos ?? []);

  // Un solo proyecto en el filtro: se muestra su tablero completo en vez del listado.
  protected readonly unico = computed(() => (this.proyectos().length === 1 ? this.proyectos()[0] : null));
  protected readonly indicadoresUnico = httpResource<Indicadores>(() => {
    const p = this.unico();
    return p ? `/api/proyectos/${p.id}/indicadores` : undefined;
  });

  protected readonly tiposCliente = TIPOS_CLIENTE;
  protected readonly tiposObra = TIPOS_OBRA;
  protected readonly todosEstados = ESTADOS_PROYECTO;
  protected readonly tipoClienteLabel = TIPO_CLIENTE_LABEL;
  protected readonly tipoObraLabel = TIPO_OBRA_LABEL;
  protected readonly estadoLabel = ESTADO_PROYECTO_LABEL;
  protected readonly numero = numero;
  protected readonly pesosCorto = pesosCorto;
  protected readonly alternar = alternar;

  // Filtros del panel (las fechas se cuentan aparte, en su propio botón).
  protected readonly cantidadFiltros = computed(
    () => this.clientes().length + this.obras().length + this.estados().length + (this.montoMin() || this.montoMax() ? 1 : 0),
  );
  protected readonly hayFiltros = computed(() => this.cantidadFiltros() > 0 || !!this.desde() || !!this.hasta());

  limpiarFiltros(): void {
    this.clientes.set([]);
    this.obras.set([]);
    this.estados.set([]);
    this.montoMin.set('');
    this.montoMax.set('');
  }

  limpiarTodo(): void {
    this.limpiarFiltros();
    this.desde.set('');
    this.hasta.set('');
  }

  protected readonly atrasadas = computed(() => this.proyectos().filter((p) => (p.desvioDias ?? 0) > 0).length);

  protected readonly porcentajeGastado = computed(() => {
    const t = this.recurso.value()?.totales;
    return t?.presupuesto ? (t.costoReal / t.presupuesto) * 100 : 0;
  });

  protected readonly porcentajeCobrado = computed(() => {
    const t = this.recurso.value()?.totales;
    return t?.presupuesto ? (t.cobrado / t.presupuesto) * 100 : 0;
  });

  // Avisos de todas las obras (sin los informativos), los críticos primero.
  protected readonly avisos = computed<Aviso[]>(() =>
    this.proyectos().flatMap((p) =>
      p.alertas.filter((a) => a.nivel !== 'INFO').map((a) => ({ ...a, proyecto: { id: p.id, nombre: p.nombre } })),
    ),
  );

  // Gráficos de comparación (como los del prototipo): un grupo de columnas por obra.
  protected readonly seriesAvance = [
    { nombre: 'Planificado', color: '#2a9d8f' },
    { nombre: 'Real', color: '#0f5fa6' },
  ];
  protected readonly seriesCosto = [
    { nombre: 'Presupuesto', color: '#2a9d8f' },
    { nombre: 'Gastado', color: '#0f5fa6' },
  ];
  protected readonly gruposAvance = computed(() =>
    this.proyectos().map((p) => ({ etiqueta: p.nombre, valores: [p.avancePlan, p.avanceReal] })),
  );
  protected readonly gruposCosto = computed(() =>
    this.proyectos().map((p) => ({ etiqueta: p.nombre, valores: [p.presupuesto, p.costoReal] })),
  );
  protected readonly porcentaje = (v: number) => `${numero(Math.round(v))} %`;

  // Cómo viene cada obra, según sus avisos.
  salud(p: ResumenProyecto): Semaforo {
    if (p.alertas.some((a) => a.nivel === 'CRITICA')) return 'critico';
    return p.alertas.some((a) => a.nivel === 'ADVERTENCIA') ? 'riesgo' : 'ok';
  }

  protected readonly saludLabel: Record<Semaforo, string> = { ok: 'Bien', riesgo: 'Atención', critico: 'Revisar' };

  plazo(p: ResumenProyecto): { texto: string; clase: string } {
    const d = p.desvioDias;
    if (d == null) return { texto: 'Sin plan', clase: 'badge--planificado' };
    if (d <= 0) return { texto: d < 0 ? `${-d} días antes` : 'A tiempo', clase: 'badge--ok' };
    return { texto: `${d} ${d === 1 ? 'día' : 'días'} tarde`, clase: semaforoDesvio(d) === 'critico' ? 'badge--critico' : 'badge--riesgo' };
  }

  titulos(p: ResumenProyecto): string {
    return p.alertas.map((a) => a.titulo).join(' · ') || 'Sin avisos';
  }

  redondo(valor: number): string {
    return numero(Math.round(valor));
  }
}
