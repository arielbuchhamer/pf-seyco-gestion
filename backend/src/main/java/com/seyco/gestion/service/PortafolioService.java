package com.seyco.gestion.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;

import org.springframework.stereotype.Service;

import com.seyco.gestion.dto.SeguimientoDtos.AprendizajeTipoObra;
import com.seyco.gestion.dto.SeguimientoDtos.ComparacionRubro;
import com.seyco.gestion.dto.SeguimientoDtos.Indicadores;
import com.seyco.gestion.dto.SeguimientoDtos.NivelAlerta;
import com.seyco.gestion.dto.SeguimientoDtos.Portafolio;
import com.seyco.gestion.dto.SeguimientoDtos.ResumenProyecto;
import com.seyco.gestion.dto.SeguimientoDtos.TotalesPortafolio;
import com.seyco.gestion.entity.EstadoProyecto;
import com.seyco.gestion.entity.Proyecto;
import com.seyco.gestion.entity.Rubro;
import com.seyco.gestion.entity.TipoCliente;
import com.seyco.gestion.entity.TipoObra;
import com.seyco.gestion.repository.ProyectoRepository;

// Portafolio (Gestión global): todos los proyectos con sus indicadores, filtrables por tipo de
// cliente, tipo de obra, año, fechas, estado y monto. Los totales y el aprendizaje por tipo de
// obra son de los proyectos filtrados.
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

	private record Fila(Proyecto proyecto, Indicadores indicadores, ResumenProyecto resumen) {
	}

	public Portafolio portafolio(Filtros filtros) {
		List<Proyecto> todos = proyectoRepository.findAll();
		List<Integer> anios = todos.stream().map(PortafolioService::anio).filter(Objects::nonNull).distinct()
				.sorted(Comparator.reverseOrder()).toList();

		LocalDate hoy = LocalDate.now();
		List<Fila> filas = todos.stream()
				.filter(p -> vacia(filtros.tiposCliente()) || filtros.tiposCliente().contains(p.getTipoCliente()))
				.filter(p -> vacia(filtros.tiposObra()) || filtros.tiposObra().contains(p.getTipoObra()))
				.filter(p -> filtros.anio() == null || filtros.anio().equals(anio(p)))
				.filter(p -> vacia(filtros.estados()) || filtros.estados().contains(p.getEstado()))
				.filter(p -> filtros.desde() == null || (fecha(p) != null && !fecha(p).isBefore(filtros.desde())))
				.filter(p -> filtros.hasta() == null || (fecha(p) != null && !fecha(p).isAfter(filtros.hasta())))
				.map(p -> {
					Indicadores i = indicadoresService.calcular(p, false, hoy);
					return new Fila(p, i, resumen(p, i));
				})
				.filter(f -> filtros.montoMin() == null || f.resumen().presupuesto().compareTo(filtros.montoMin()) >= 0)
				.filter(f -> filtros.montoMax() == null || f.resumen().presupuesto().compareTo(filtros.montoMax()) <= 0)
				.sorted(Comparator.comparing((Fila f) -> f.resumen().fechaInicio(),
						Comparator.nullsLast(Comparator.reverseOrder())))
				.toList();

		List<ResumenProyecto> proyectos = filas.stream().map(Fila::resumen).toList();
		return new Portafolio(totales(proyectos), proyectos, anios, aprendizaje(filas));
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

	// Aprendizaje para cotizar: por tipo de obra, cuánto se desvían en promedio el plazo, el costo
	// y cada rubro. Sirve para la próxima cotización ("el zanjeo sale 15 % más caro en equipos").
	//   plazo -> días de desvío / días del plan (obras con línea base fijada)
	//   costo -> costo real / valor ganado - 1 (lo gastado contra lo que valía lo avanzado)
	//   rubro -> gastado / (cotizado del rubro x avance) - 1; se informa el de mayor promedio
	private static List<AprendizajeTipoObra> aprendizaje(List<Fila> filas) {
		Map<TipoObra, List<Indicadores>> porTipo = new LinkedHashMap<>();
		for (TipoObra tipo : TipoObra.values()) {
			porTipo.put(tipo, new ArrayList<>());
		}
		porTipo.put(null, new ArrayList<>()); // obras sin clasificar
		filas.forEach(f -> porTipo.get(f.proyecto().getTipoObra()).add(f.indicadores()));

		List<AprendizajeTipoObra> resultado = new ArrayList<>();
		porTipo.forEach((tipo, obras) -> {
			if (obras.isEmpty()) {
				return;
			}
			List<Double> plazos = obras.stream()
					.filter(i -> i.lineaBaseFijada() && i.plazo().desvioDias() != null && i.plazo().diasPlan() != null
							&& i.plazo().diasPlan() > 0)
					.map(i -> i.plazo().desvioDias() * 100.0 / i.plazo().diasPlan()).toList();
			List<Double> costos = obras.stream()
					.filter(i -> i.valorGanado().signum() > 0 && i.costoReal().signum() > 0)
					.map(i -> (i.costoReal().doubleValue() / i.valorGanado().doubleValue() - 1) * 100).toList();

			Map<Rubro, List<Double>> porRubro = new EnumMap<>(Rubro.class);
			for (Indicadores i : obras) {
				for (ComparacionRubro r : i.rubros()) {
					if (r.presupuestado().signum() > 0 && i.avanceReal() > 0) {
						double esperado = r.presupuestado().doubleValue() * i.avanceReal() / 100;
						porRubro.computeIfAbsent(r.rubro(), k -> new ArrayList<>())
								.add((r.real().doubleValue() / esperado - 1) * 100);
					}
				}
			}
			Rubro peor = null;
			Double desvioPeor = null;
			for (Map.Entry<Rubro, List<Double>> e : porRubro.entrySet()) {
				Double promedio = promedio(e.getValue());
				if (promedio != null && promedio > 0 && (desvioPeor == null || promedio > desvioPeor)) {
					peor = e.getKey();
					desvioPeor = promedio;
				}
			}
			resultado.add(new AprendizajeTipoObra(tipo, obras.size(), promedio(plazos), plazos.size(), promedio(costos),
					costos.size(), peor, desvioPeor));
		});
		return resultado;
	}

	private static Double promedio(List<Double> valores) {
		return valores.isEmpty() ? null
				: Math.round(valores.stream().mapToDouble(Double::doubleValue).average().orElse(0) * 10) / 10.0;
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
