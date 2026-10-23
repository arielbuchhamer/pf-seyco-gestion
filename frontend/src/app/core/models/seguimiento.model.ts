// Seguimiento de obra: indicadores proyectado vs. real, costos reales, certificaciones y
// portafolio (ver SeguimientoDtos en el backend). Montos en pesos sin IVA; porcentajes 0-100.

import { EstadoProyecto, TipoCliente, TipoObra } from './proyecto.model';

export type Rubro = 'MANO_OBRA' | 'EQUIPOS' | 'MATERIALES' | 'TERCEROS';

// Mismos nombres y colores que la "Distribución por rubro" del presupuesto (paleta validada
// para daltonismo y contraste sobre fondo blanco).
export const RUBRO_LABEL: Record<Rubro, string> = {
  MANO_OBRA: 'Mano de obra',
  EQUIPOS: 'Equipos y grúas',
  MATERIALES: 'Materiales',
  TERCEROS: 'Provisión de terceros',
};
export const RUBRO_COLOR: Record<Rubro, string> = {
  MANO_OBRA: '#0f5fa6',
  EQUIPOS: '#c8790f',
  MATERIALES: '#2a9d8f',
  TERCEROS: '#8a5cc2',
};
export const RUBROS = Object.keys(RUBRO_LABEL) as Rubro[];

export type NivelAlerta = 'INFO' | 'ADVERTENCIA' | 'CRITICA';

export interface Alerta {
  nivel: NivelAlerta;
  titulo: string;
  detalle: string | null;
}

export interface ResumenCertificacion {
  montoContrato: number | null;
  certificado: number;
  cobrado: number;
  pendienteCobro: number;
  // Lo que todavía no se facturó: si la obra terminó, es plata que se pierde si nadie la sigue.
  saldoPorCertificar: number;
  saldoPorCobrar: number;
  porcentajeCertificado: number;
  porcentajeCobrado: number;
  ultimaCertificacion: string | null;
  diasDesdeUltima: number | null;
}

export interface ComparacionRubro {
  rubro: Rubro;
  presupuestado: number;
  real: number;
  desvio: number;
  porcentajeConsumido: number;
}

export interface PuntoCurvaS {
  fecha: string;
  plan: number;
  real: number | null;
}

export interface DesvioTarea {
  tareaId: number;
  numero: string | null;
  nombre: string;
  finPlan: string;
  finEstimado: string;
  desvioDias: number;
  avance: number;
}

// desvioDias < 0 = termina antes que el plan (rendimiento positivo).
export interface Plazo {
  inicioPlan: string | null;
  finPlan: string | null;
  inicioReal: string | null;
  finEstimado: string | null;
  diasPlan: number | null;
  diasEstimados: number | null;
  desvioDias: number | null;
  plazoCotizadoDias: number | null;
}

// GET /api/proyectos/{id}/indicadores
export interface Indicadores {
  proyectoId: number;
  nombre: string;
  lineaBaseFijada: boolean;
  plazo: Plazo;
  avancePlan: number;
  avanceReal: number;
  // SPI = avance real / plan; CPI = valor ganado / costo real. < 1 = peor que lo previsto.
  spi: number | null;
  cpi: number | null;
  presupuesto: number;
  costoReal: number;
  valorGanado: number;
  costoProyectado: number | null;
  rubros: ComparacionRubro[];
  certificacion: ResumenCertificacion;
  curvaS: PuntoCurvaS[];
  desvios: DesvioTarea[];
  alertas: Alerta[];
}

export interface CostoReal {
  id: number;
  fecha: string;
  rubro: Rubro;
  descripcion: string;
  comprobante: string | null;
  monto: number;
}

export type CostoRealInput = Omit<CostoReal, 'id'>;

export type TipoCertificacion = 'ANTICIPO' | 'AVANCE' | 'FINAL';
export type EstadoCertificacion = 'PENDIENTE_COBRO' | 'COBRADA';

export const TIPO_CERTIFICACION_LABEL: Record<TipoCertificacion, string> = {
  ANTICIPO: 'Anticipo',
  AVANCE: 'Avance',
  FINAL: 'Final',
};
export const ESTADO_CERTIFICACION_LABEL: Record<EstadoCertificacion, string> = {
  PENDIENTE_COBRO: 'Pendiente de cobro',
  COBRADA: 'Cobrada',
};

export interface Certificacion {
  id: number;
  numero: number;
  tipo: TipoCertificacion;
  fechaEmision: string;
  porcentaje: number | null;
  monto: number;
  nroFactura: string | null;
  estado: EstadoCertificacion;
  fechaCobro: string | null;
  observaciones: string | null;
}

// Monto o porcentaje: si viene sólo el porcentaje, el backend calcula el monto sobre el contrato.
export interface CertificacionInput {
  tipo: TipoCertificacion;
  fechaEmision: string;
  porcentaje: number | null;
  monto: number | null;
  nroFactura: string | null;
  estado: EstadoCertificacion;
  fechaCobro: string | null;
  observaciones: string | null;
}

export interface ResumenProyecto {
  id: number;
  nombre: string;
  cliente: string | null;
  tipoCliente: TipoCliente | null;
  tipoObra: TipoObra | null;
  estado: EstadoProyecto;
  fechaInicio: string | null;
  fechaFin: string | null;
  presupuesto: number;
  costoReal: number;
  avancePlan: number;
  avanceReal: number;
  spi: number | null;
  cpi: number | null;
  // null mientras no se fija la línea base.
  desvioDias: number | null;
  certificacion: ResumenCertificacion;
  alertas: Alerta[];
}

export interface TotalesPortafolio {
  proyectos: number;
  enCurso: number;
  presupuesto: number;
  costoReal: number;
  certificado: number;
  cobrado: number;
  pendienteCobro: number;
  saldoPorCertificar: number;
  saldoPorCobrar: number;
  conAlertasCriticas: number;
  spiPromedio: number | null;
}

// GET /api/portafolio
export interface Portafolio {
  totales: TotalesPortafolio;
  proyectos: ResumenProyecto[];
  anios: number[];
}
