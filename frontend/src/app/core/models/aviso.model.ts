import { NivelAlerta } from './seguimiento.model';

// Solapa de la pantalla de la obra donde se resuelve el aviso (la calcula el backend).
export type SolapaAviso = 'fechas' | 'gantt' | 'indicadores' | 'costos' | 'certificaciones';

// Un aviso de una obra (GET /api/avisos). Se calcula al momento en el backend: no se guarda.
export interface AvisoProyecto {
  proyectoId: number;
  proyectoNombre: string;
  nivel: NivelAlerta;
  titulo: string;
  detalle: string | null;
  solapa: SolapaAviso;
  // Cuándo empezó la situación (filtro por fecha de la pantalla Avisos).
  fecha?: string | null;
}

export interface TotalesAvisos {
  criticos: number;
  advertencias: number;
  informativos: number;
  // Obras con al menos un aviso crítico (no cantidad de avisos).
  proyectosConCriticos: number;
}

// Vienen ordenados: críticos, advertencias e informativos; dentro de cada nivel, por obra.
export interface RespuestaAvisos {
  totales: TotalesAvisos;
  avisos: AvisoProyecto[];
}

// Texto y ícono de cada nivel. El color nunca es la única señal: siempre va ícono y texto.
export const NIVELES_AVISO: Record<NivelAlerta, { etiqueta: string; clase: string }> = {
  CRITICA: { etiqueta: 'Para revisar', clase: 'revisar' },
  ADVERTENCIA: { etiqueta: 'De atención', clase: 'atencion' },
  INFO: { etiqueta: 'Informativo', clase: 'info' },
};
