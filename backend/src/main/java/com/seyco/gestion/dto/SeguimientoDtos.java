package com.seyco.gestion.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.seyco.gestion.entity.EstadoProyecto;
import com.seyco.gestion.entity.Rubro;
import com.seyco.gestion.entity.TipoCliente;
import com.seyco.gestion.entity.TipoObra;

// Seguimiento de obra: análisis proyectado vs. real de un proyecto (solapa Indicadores y
// reporte de obra), cobranza (certificaciones) y portafolio con todos los proyectos.
// Montos en pesos sin IVA; porcentajes de 0 a 100.
public final class SeguimientoDtos {

	private SeguimientoDtos() {
	}

	public enum NivelAlerta {
		INFO, ADVERTENCIA, CRITICA
	}

	public record Alerta(NivelAlerta nivel, String titulo, String detalle) {
	}

	// Cobranza: cuánto del contrato (total del presupuesto) se certificó y cuánto se cobró.
	// saldoPorCertificar es la plata que todavía no se facturó: si la obra terminó y queda
	// algo acá, es el 15 % "que nadie sigue" y se pierde.
	public record ResumenCertificacion(BigDecimal montoContrato, BigDecimal certificado, BigDecimal cobrado,
			BigDecimal pendienteCobro, BigDecimal saldoPorCertificar, BigDecimal saldoPorCobrar,
			double porcentajeCertificado, double porcentajeCobrado, LocalDate ultimaCertificacion,
			Long diasDesdeUltima) {
	}

	// Lo cotizado de un rubro contra lo gastado (CostoReal). desvio > 0 = se gastó más de lo cotizado.
	public record ComparacionRubro(Rubro rubro, BigDecimal presupuestado, BigDecimal real, BigDecimal desvio,
			double porcentajeConsumido) {
	}

	// Punto de la curva S: % de avance acumulado planificado y real (real = null en fechas futuras).
	public record PuntoCurvaS(LocalDate fecha, double plan, Double real) {
	}

	// Tarea con atraso respecto de su fin plan (línea base). desvioDias > 0 = atrasada.
	public record DesvioTarea(Long tareaId, String numero, String nombre, LocalDate finPlan, LocalDate finEstimado,
			long desvioDias, int avance) {
	}

	// Plazo cotizado vs. real. desvioDias < 0 = termina antes (rendimiento positivo por velocidad).
	public record Plazo(LocalDate inicioPlan, LocalDate finPlan, LocalDate inicioReal, LocalDate finEstimado,
			Long diasPlan, Long diasEstimados, Long desvioDias, Integer plazoCotizadoDias) {
	}

	// GET /api/proyectos/{id}/indicadores
	// spi = avance real / avance plan (< 1 atrasado); cpi = valor ganado / costo real (< 1 se
	// gasta más de lo que se avanza). Null cuando no hay con qué calcularlos.
	public record Indicadores(Long proyectoId, String nombre, boolean lineaBaseFijada, Plazo plazo, double avancePlan,
			double avanceReal, Double spi, Double cpi, BigDecimal presupuesto, BigDecimal costoReal,
			BigDecimal valorGanado, BigDecimal costoProyectado, List<ComparacionRubro> rubros,
			ResumenCertificacion certificacion, List<PuntoCurvaS> curvaS, List<DesvioTarea> desvios,
			List<Alerta> alertas) {
	}

	// Fila del portafolio.
	public record ResumenProyecto(Long id, String nombre, String cliente, TipoCliente tipoCliente, TipoObra tipoObra,
			EstadoProyecto estado, LocalDate fechaInicio, LocalDate fechaFin, BigDecimal presupuesto,
			BigDecimal costoReal, double avancePlan, double avanceReal, Double spi, Double cpi, Long desvioDias,
			ResumenCertificacion certificacion, List<Alerta> alertas) {
	}

	public record TotalesPortafolio(int proyectos, int enCurso, BigDecimal presupuesto, BigDecimal costoReal,
			BigDecimal certificado, BigDecimal cobrado, BigDecimal pendienteCobro, BigDecimal saldoPorCertificar,
			BigDecimal saldoPorCobrar, int conAlertasCriticas, Double spiPromedio) {
	}

	// GET /api/portafolio. anios: años con proyectos (opciones del filtro, sin filtrar).
	public record Portafolio(TotalesPortafolio totales, List<ResumenProyecto> proyectos, List<Integer> anios) {
	}
}
