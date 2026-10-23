import { Tarea } from '../models/tarea.model';
import { diasEntre, hoy } from './formato';

export type Semaforo = 'ok' | 'riesgo' | 'critico';

// SPI / CPI: 1 o más es lo previsto o mejor; hasta 0,9 se considera en riesgo; menos, crítico.
export function semaforoIndice(valor: number | null | undefined): Semaforo | null {
  if (valor == null) return null;
  return valor >= 1 ? 'ok' : valor >= 0.9 ? 'riesgo' : 'critico';
}

// Desvío de plazo en días: hasta 3 días de atraso es riesgo, más es crítico (como en las alertas del Gantt).
export function semaforoDesvio(dias: number | null | undefined): Semaforo | null {
  if (dias == null) return null;
  return dias <= 0 ? 'ok' : dias <= 3 ? 'riesgo' : 'critico';
}

export const SEMAFORO_LABEL: Record<Semaforo, string> = {
  ok: 'En fecha',
  riesgo: 'En riesgo',
  critico: 'Desviado',
};

// Avance de una tarea: el cargado, o 100 % si está completada y no tiene avance (igual que el backend).
export function avanceTarea(tarea: Tarea): number {
  return tarea.avance ?? (tarea.estado === 'COMPLETADA' ? 100 : 0);
}

// Fin estimado: el fin estimado/real cargado; si venció el plan sin terminar, hoy; si no, el fin plan.
export function finEstimado(tarea: Pick<Tarea, 'fechaFin' | 'fechaFinReal'>, avance: number): string | null {
  if (tarea.fechaFinReal) return tarea.fechaFinReal;
  const h = hoy();
  if (tarea.fechaFin && tarea.fechaFin < h && avance < 100) return h;
  return tarea.fechaFin;
}

// Días de atraso respecto del fin plan (negativo = adelantada). null sin fin plan.
export function desvioTarea(tarea: Pick<Tarea, 'fechaFin' | 'fechaFinReal'>, avance: number): number | null {
  const fin = finEstimado(tarea, avance);
  return tarea.fechaFin && fin ? diasEntre(tarea.fechaFin, fin) : null;
}

// Orden del Excel (orden entre hermanas); las tareas cargadas a mano van al final, por id.
export function ordenarTareas(a: Tarea, b: Tarea): number {
  return (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER) || a.id - b.id;
}

// Árbol tarea › subtarea aplanado en el orden en que se muestra.
export function aplanarTareas(tareas: Tarea[]): { tarea: Tarea; subtarea: boolean; tieneSubtareas: boolean }[] {
  const hijos = new Map<number, Tarea[]>();
  for (const t of tareas) {
    if (t.padreId != null) hijos.set(t.padreId, [...(hijos.get(t.padreId) ?? []), t]);
  }
  const filas: { tarea: Tarea; subtarea: boolean; tieneSubtareas: boolean }[] = [];
  for (const t of tareas.filter((x) => x.padreId == null).sort(ordenarTareas)) {
    const subs = (hijos.get(t.id) ?? []).sort(ordenarTareas);
    filas.push({ tarea: t, subtarea: false, tieneSubtareas: subs.length > 0 });
    subs.forEach((s) => filas.push({ tarea: s, subtarea: true, tieneSubtareas: false }));
  }
  return filas;
}

// Agrega o quita un valor de una lista (checks de los filtros).
export function alternar<T>(lista: T[], valor: T): T[] {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

// ¿La fecha ISO cae en el rango desde/hasta ('' = sin límite)? Sin fecha, sólo si no hay rango.
export function enRango(fechaIso: string | null | undefined, desde: string, hasta: string): boolean {
  if (!desde && !hasta) return true;
  if (!fechaIso) return false;
  const f = fechaIso.slice(0, 10);
  return (!desde || f >= desde) && (!hasta || f <= hasta);
}
