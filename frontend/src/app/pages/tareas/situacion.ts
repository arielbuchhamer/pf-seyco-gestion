// Situación de una tarea según su fin estimado/real contra el fin de la línea base
// (pantalla Tareas: grilla e indicadores).
export type Situacion = 'sin-datos' | 'en-fecha' | 'en-riesgo' | 'desviado';

// Hasta este desvío (días) la tarea está "en riesgo"; más, "desviada".
export const DIAS_EN_RIESGO = 3;

export const SITUACIONES: Situacion[] = ['en-fecha', 'en-riesgo', 'desviado', 'sin-datos'];

export const SITUACION_LABEL: Record<Situacion, string> = {
  'sin-datos': 'Sin estimar',
  'en-fecha': 'En fecha',
  'en-riesgo': 'En riesgo',
  desviado: 'Desviado',
};

export function situacion(desvio: number | null): Situacion {
  if (desvio == null) return 'sin-datos';
  if (desvio <= 0) return 'en-fecha';
  return desvio <= DIAS_EN_RIESGO ? 'en-riesgo' : 'desviado';
}
