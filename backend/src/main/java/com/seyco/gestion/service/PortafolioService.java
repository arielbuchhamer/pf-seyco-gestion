package com.seyco.gestion.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;

import org.springframework.stereotype.Service;

import com.seyco.gestion.dto.SeguimientoDtos.Indicadores;
import com.seyco.gestion.dto.SeguimientoDtos.NivelAlerta;
import com.seyco.gestion.dto.SeguimientoDtos.Portafolio;
import com.seyco.gestion.dto.SeguimientoDtos.ResumenProyecto;
import com.seyco.gestion.dto.SeguimientoDtos.TotalesPortafolio;
import com.seyco.gestion.entity.EstadoProyecto;
import com.seyco.gestion.entity.Proyecto;
import com.seyco.gestion.entity.TipoCliente;
import com.seyco.gestion.entity.TipoObra;
import com.seyco.gestion.repository.ProyectoRepository;

// Portafolio (Gestión global): todos los proyectos con sus indicadores, filtrables por tipo de
// cliente, tipo de obra, fechas, estado y monto. Los totales son de los proyectos filtrados.
// Se calcula en memoria: la cantidad de obras de Seyco no justifica consultas agregadas.
@Service
public class PortafolioService {

	private final ProyectoRepository proyectoRepository;
	private final IndicadoresService indicadoresService;

	public PortafolioService(ProyectoRepository proyectoRepository, IndicadoresService indicadoresService) {
		this.proyectoRepository = proyectoRepository;
		this.indicadoresService = indicadoresService;
	}

	// Listas vacías = sin filtrar; con varios valores, alcanza con que coincida uno (los checks del
	// panel "Filtros"). desde/hasta: rango de la fecha de la obra (inicio, o la importación).
	public record Filtros(List<TipoCliente> tiposCliente, List<TipoObra> tiposObra, Integer anio,
			List<EstadoProyecto> estados, BigDecimal montoMin, BigDecimal montoMax, LocalDate desde, LocalDate hasta) {
	}

	public Portafolio portafolio(Filtros filtros) {
		List<Proyecto> todos = proyectoRepository.findAll();
		List<Integer> anios = todos.stream().map(PortafolioService::anio).filter(Objects::nonNull).distinct()
				.sorted(Comparator.reverseOrder()).toList();

		LocalDate hoy = LocalDate.now();
		List<ResumenProyecto> proyectos = todos.stream()
				.filter(p -> vacia(filtros.tiposCliente()) || filtros.tiposCliente().contains(p.getTipoCliente()))
				.filter(p -> vacia(filtros.tiposObra()) || filtros.tiposObra().contains(p.getTipoObra()))
				.filter(p -> filtros.anio() == null || filtros.anio().equals(anio(p)))
				.filter(p -> vacia(filtros.estados()) || filtros.estados().contains(p.getEstado()))
				.filter(p -> filtros.desde() == null || (fecha(p) != null && !fecha(p).isBefore(filtros.desde())))
				.filter(p -> filtros.hasta() == null || (fecha(p) != null && !fecha(p).isAfter(filtros.hasta())))
				.map(p -> resumen(p, indicadoresService.calcular(p, false, hoy)))
				.filter(r -> filtros.montoMin() == null || r.presupuesto().compareTo(filtros.montoMin()) >= 0)
				.filter(r -> filtros.montoMax() == null || r.presupuesto().compareTo(filtros.montoMax()) <= 0)
				.sorted(Comparator.comparing(ResumenProyecto::fechaInicio, Comparator.nullsLast(Comparator.reverseOrder())))
				.toList();

		return new Portafolio(totales(proyectos), proyectos, anios);
	}

	private static ResumenProyecto resumen(Proyecto p, Indicadores i) {
		return new ResumenProyecto(p.getId(), p.getNombre(), p.getCliente(), p.getTipoCliente(), p.getTipoObra(),
				p.getEstado(), p.getFechaInicio(), p.getFechaFin(), i.presupuesto(), i.costoReal(), i.avancePlan(),
				i.avanceReal(), i.spi(), i.cpi(), i.lineaBaseFijada() ? i.plazo().desvioDias() : null, i.certificacion(),
				i.alertas());
	}

	private static TotalesPortafolio totales(List<ResumenProyecto> proyectos) {
		Function<Function<ResumenProyecto, BigDecimal>, BigDecimal> sumar = campo -> proyectos.stream().map(campo)
				.filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
		List<Double> spis = proyectos.stream().map(ResumenProyecto::spi).filter(Objects::nonNull).toList();
		return new TotalesPortafolio(proyectos.size(),
				(int) proyectos.stream().filter(p -> p.estado() == EstadoProyecto.EN_CURSO).count(),
				sumar.apply(ResumenProyecto::presupuesto), sumar.apply(ResumenProyecto::costoReal),
				sumar.apply(p -> p.certificacion().certificado()), sumar.apply(p -> p.certificacion().cobrado()),
				sumar.apply(p -> p.certificacion().pendienteCobro()), sumar.apply(p -> p.certificacion().saldoPorCertificar()),
				sumar.apply(p -> p.certificacion().saldoPorCobrar()),
				(int) proyectos.stream().filter(p -> p.alertas().stream().anyMatch(a -> a.nivel() == NivelAlerta.CRITICA)).count(),
				spis.isEmpty() ? null : Math.round(spis.stream().mapToDouble(Double::doubleValue).average().orElse(0) * 100) / 100.0);
	}

	// Fecha de la obra: la de inicio; si no tiene, la de la importación.
	private static LocalDate fecha(Proyecto p) {
		if (p.getFechaInicio() != null) {
			return p.getFechaInicio();
		}
		return p.getFechaImportacion() == null ? null : p.getFechaImportacion().toLocalDate();
	}

	private static Integer anio(Proyecto p) {
		LocalDate fecha = fecha(p);
		return fecha == null ? null : fecha.getYear();
	}

	private static boolean vacia(List<?> lista) {
		return lista == null || lista.isEmpty();
	}
}
