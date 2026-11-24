import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvisoProyecto, NIVELES_AVISO } from '../../core/models/aviso.model';
import { NivelAlerta } from '../../core/models/seguimiento.model';
import { AvisosService } from '../../core/services/avisos.service';
import { Aviso, AvisosComponent } from '../../shared/alertas/avisos.component';
import { CabeceraComponent } from '../../shared/cabecera/cabecera.component';
import { KpiComponent } from '../../shared/kpi/kpi.component';
import { FiltroFechasComponent } from '../../shared/filtros/filtro-fechas.component';
import { PaginadorComponent, paginacion } from '../../shared/paginador/paginador.component';
import { enRango } from '../../core/utils/seguimiento';

export type FiltroNivel = '' | NivelAlerta;

// Avisos de todas las obras en una sola lista (los críticos primero), con filtro por obra, por
// nivel y por fecha (desde cuándo pasa cada aviso), paginada de a 10. Los datos son los mismos de la campanita (AvisosService), así que no se vuelve a
// recorrer todas las obras al entrar. Cada aviso lleva al tablero de su obra.
@Component({
  selector: 'app-avisos-page',
  standalone: true,
  imports: [RouterLink, CabeceraComponent, KpiComponent, AvisosComponent, FiltroFechasComponent, PaginadorComponent],
  templateUrl: './avisos.component.html',
  styleUrl: './avisos.component.css',
})
export class AvisosPageComponent {
  protected readonly avisosSvc = inject(AvisosService);

  protected readonly niveles: NivelAlerta[] = ['CRITICA', 'ADVERTENCIA', 'INFO'];
  protected readonly etiquetaNivel = (n: NivelAlerta) => NIVELES_AVISO[n].etiqueta;

  protected readonly proyecto = signal('');
  protected readonly nivel = signal<FiltroNivel>('');
  protected readonly desde = signal('');
  protected readonly hasta = signal('');

  // Sólo las obras que tienen avisos.
  protected readonly proyectos = computed(() => {
    const porId = new Map<number, string>();
    this.avisosSvc.avisos().forEach((a) => porId.set(a.proyectoId, a.proyectoNombre));
    return [...porId]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  protected readonly filtrados = computed<Aviso[]>(() => {
    const proyecto = this.proyecto();
    const nivel = this.nivel();
    return this.avisosSvc
      .avisos()
      .filter(
        (a) =>
          (!proyecto || String(a.proyectoId) === proyecto) &&
          (!nivel || a.nivel === nivel) &&
          enRango(a.fecha, this.desde(), this.hasta()),
      )
      .map(aAviso);
  });

  protected readonly paginas = paginacion(() => this.filtrados());

  protected readonly hayFiltros = computed(
    () => !!this.proyecto() || !!this.nivel() || !!this.desde() || !!this.hasta(),
  );

  constructor() {
    this.avisosSvc.recargar();
  }

  protected limpiarFiltros(): void {
    this.proyecto.set('');
    this.nivel.set('');
    this.desde.set('');
    this.hasta.set('');
  }
}

function aAviso(a: AvisoProyecto): Aviso {
  return {
    nivel: a.nivel,
    titulo: a.titulo,
    detalle: a.detalle,
    proyecto: { id: a.proyectoId, nombre: a.proyectoNombre },
    solapa: a.solapa,
    fecha: a.fecha,
  };
}
