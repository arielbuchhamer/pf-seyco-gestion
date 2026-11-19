package com.seyco.gestion.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.seyco.gestion.entity.EstadoProyecto;
import com.seyco.gestion.entity.Rubro;
import com.seyco.gestion.entity.TipoCertificacion;
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

	// Lo cotizado en un renglón del presupuesto (en el rubro del gasto) contra los gastos que se
	// cargaron indicando ese renglón. Ej.: "Hora de grúa", Equipos: cotizado $30 M, real $40 M.
	public record ComparacionRenglon(Long itemId, String numero, String descripcion, Rubro rubro, BigDecimal cotizado,
			BigDecimal real, BigDecimal desvio, double porcentajeConsumido) {
	}

	// La obra en dólares, para sacar el efecto de la inflación: lo cotizado se pasa a dólares con
	// la cotización del día del presupuesto y cada gasto con la del día en que se hizo.
	// presupuestoActualizado = lo cotizado llevado a pesos de hoy (presupuestoUsd × dólar de hoy).
	// disponible = false (con el motivo) si no hay cotización o la obra no tiene presupuesto.
	public record EnDolares(boolean disponible, String motivo, String casa, LocalDate fechaPresupuesto,
			BigDecimal dolarPresupuesto, LocalDate fechaHoy, BigDecimal dolarHoy, BigDecimal presupuestoUsd,
			BigDecimal costoRealUsd, BigDecimal presupuestoActualizado, List<ComparacionRubro> rubros) {

		public static EnDolares noDisponible(String motivo) {
			return new EnDolares(false, motivo, null, null, null, null, null, null, null, null, List.of());
		}
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
	// renglones: comparación por renglón del presupuesto (sólo los que tienen gastos asignados).
	// enDolares: null en el portafolio (sólo se calcula en el detalle de la obra).
	public record Indicadores(Long proyectoId, String nombre, boolean lineaBaseFijada, Plazo plazo, double avancePlan,
			double avanceReal, Double spi, Double cpi, BigDecimal presupuesto, BigDecimal costoReal,
			BigDecimal valorGanado, BigDecimal costoProyectado, List<ComparacionRubro> rubros,
			ResumenCertificacion certificacion, List<PuntoCurvaS> curvaS, List<DesvioTarea> desvios,
			List<Alerta> alertas, List<ComparacionRenglon> renglones, EnDolares enDolares) {
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

	// Aprendizaje para cotizar: cómo vienen en promedio las obras de un tipo (de las filtradas).
	//   desvioPlazo  -> % de días de más (+) o de menos (−) sobre el plazo plan (obras con línea base)
	//   desvioCosto  -> % gastado de más (+) o de menos (−) respecto de lo que valía lo avanzado
	//   rubroMasExcedido / desvioRubro -> el rubro que más se pasa en promedio y por cuánto (%)
	// Los promedios son null si ninguna obra del tipo tiene datos para calcularlos.
	public record AprendizajeTipoObra(TipoObra tipoObra, int obras, Double desvioPlazo, int obrasConPlazo,
			Double desvioCosto, int obrasConCosto, Rubro rubroMasExcedido, Double desvioRubro) {
	}

	// GET /api/portafolio. anios: años con proyectos (opciones del filtro, sin filtrar).
	public record Portafolio(TotalesPortafolio totales, List<ResumenProyecto> proyectos, List<Integer> anios,
			List<AprendizajeTipoObra> aprendizaje) {
	}

	// ── Cobranzas (pantalla global: qué falta certificar y cobrar en todas las obras) ──

	// Una obra con plata pendiente. nivel/motivo: lo más urgente (CRITICA = obra terminada con
	// saldo sin certificar, el "15 % que se pierde").
	public record ObraCobranza(Long proyectoId, String nombre, String cliente, TipoCliente tipoCliente,
			EstadoProyecto estado, double avanceReal, boolean terminada, ResumenCertificacion certificacion,
			NivelAlerta nivel, String motivo) {
	}

	// Certificación emitida y todavía no cobrada.
	public record FacturaPendiente(Long proyectoId, String proyecto, Long certificacionId, Integer numero,
			TipoCertificacion tipo, LocalDate fechaEmision, String nroFactura, BigDecimal monto, long dias) {
	}

	// GET /api/cobranzas. porCobrar = todo lo que falta entrar (sin certificar + facturado sin cobrar).
	public record Cobranzas(BigDecimal porCobrar, BigDecimal facturadoSinCobrar, BigDecimal sinCertificar,
			BigDecimal sinCertificarTerminadas, int obrasTerminadasConSaldo, List<ObraCobranza> obras,
			List<FacturaPendiente> facturas) {
	}
}
