import { EstadoProyecto } from '../models/proyecto.model';

// Un proyecto está vencido si su fecha fin planificada ya pasó y todavía no se completó.
// No alcanza con "la fecha ya pasó": un proyecto FINALIZADO con fechaFin en el pasado es
// justamente lo esperado, no una alerta. Comparación de strings ISO (yyyy-MM-dd) funciona
// directo, sin necesidad de parsear a Date.
export function estaVencido(fechaFin: string | null, estado: EstadoProyecto): boolean {
  if (!fechaFin || estado === 'FINALIZADO') {
    return false;
  }
  const hoy = new Date().toISOString().slice(0, 10);
  return fechaFin < hoy;
}
