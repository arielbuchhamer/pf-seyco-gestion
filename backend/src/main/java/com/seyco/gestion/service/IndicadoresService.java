package com.seyco.gestion.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.seyco.gestion.dto.SeguimientoDtos.Alerta;
import com.seyco.gestion.dto.SeguimientoDtos.ComparacionRubro;
import com.seyco.gestion.dto.SeguimientoDtos.DesvioTarea;
import com.seyco.gestion.dto.SeguimientoDtos.Indicadores;
import com.seyco.gestion.dto.SeguimientoDtos.NivelAlerta;
import com.seyco.gestion.dto.SeguimientoDtos.Plazo;
import com.seyco.gestion.dto.SeguimientoDtos.PuntoCurvaS;
import com.seyco.gestion.dto.SeguimientoDtos.ResumenCertificacion;
import com.seyco.gestion.entity.Certificacion;
import com.seyco.gestion.entity.CostoReal;
import com.seyco.gestion.entity.EstadoCertificacion;
import com.seyco.gestion.entity.EstadoProyecto;
import com.seyco.gestion.entity.EstadoTarea;
import com.seyco.gestion.entity.ItemPresupuesto;
import com.seyco.gestion.entity.Presupuesto;
import com.seyco.gestion.entity.Proyecto;
import com.seyco.gestion.entity.Rubro;
import com.seyco.gestion.entity.Tarea;
import com.seyco.gestion.entity.TipoItemPresupuesto;
import com.seyco.gestion.repository.CertificacionRepository;
import com.seyco.gestion.repository.CostoRealRepository;
import com.seyco.gestion.repository.ItemPresupuestoRepository;
import com.seyco.gestion.repository.PresupuestoRepository;
import com.seyco.gestion.repository.TareaRepository;

/*
 * ANÁLISIS PROYECTADO VS. REAL DE UN PROYECTO
 * Se mide sobre las tareas sin subtareas (donde se cargan fechas y avance), ponderadas por su
 * monto en el presupuesto: una subtarea de $10 M pesa diez veces más que una de $1 M. Si el
 * proyecto no tiene presupuesto, todas pesan igual.
 *   avance plan  -> qué parte del plazo plan (línea base) de cada tarea ya pasó a la fecha
 *   avance real  -> % de avance cargado (o 100 % si la tarea está COMPLETADA y no tiene avance)
 *   SPI = real / plan        CPI = valor ganado (avance real × presupuesto) / costo real
 * Plazo: fin estimado = el último fin estimado/real de las tareas; una tarea vencida sin fin
 * estimado se toma como "termina hoy". Desvío negativo = termina antes (rendimiento positivo).
 */
@Service
public class IndicadoresService {

	private static final Map<Rubro, String> RUBRO_LABEL = Map.of(Rubro.MANO_OBRA, "Mano de obra", Rubro.EQUIPOS,
			"Equipos y grúas", Rubro.MATERIALES, "Materiales", Rubro.TERCEROS, "Provisión de terceros");
	private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
	private static final int DIAS_ALERTA_COBRO = 60;
	private static final int DIAS_ALERTA_CERTIFICACION = 90;

	private final ProyectoService proyectoService;
	private final TareaRepository tareaRepository;
	private final PresupuestoRepository presupuestoRepository;
	private final ItemPresupuestoRepository itemPresupuestoRepository;
	private final CostoRealRepository costoRealRepository;
	private final CertificacionRepository certificacionRepository;

	public IndicadoresService(ProyectoService proyectoService, TareaRepository tareaRepository,
			PresupuestoRepository presupuestoRepository, ItemPresupuestoRepository itemPresupuestoRepository,
			CostoRealRepository costoRealRepository, CertificacionRepository certificacionRepository) {
		this.proyectoService = proyectoService;
		this.tareaRepository = tareaRepository;
		this.presupuestoRepository = presupuestoRepository;
		this.itemPresupuestoRepository = itemPresupuestoRepository;
		this.costoRealRepository = costoRealRepository;
		this.certificacionRepository = certificacionRepository;
	}

	public Indicadores indicadores(Long proyectoId) {
		return calcular(proyectoService.buscarPorId(proyectoId), true, LocalDate.now());
	}

	// detalle = false para el portafolio: sin curva S ni desvíos por tarea.
	public Indicadores calcular(Proyecto proyecto, boolean detalle, LocalDate hoy) {
		Long id = proyecto.getId();
		List<Tarea> tareas = tareaRepository.findByProyectoId(id);
		Set<Long> conSubtareas = tareas.stream().map(Tarea::getPadreId).filter(Objects::nonNull)
				.collect(Collectors.toSet());
		List<Tarea> hojas = tareas.stream().filter(t -> !conSubtareas.contains(t.getId())).toList();

		Presupuesto presupuesto = presupuestoRepository.findByProyectoId(id).orElse(null);
		List<ItemPresupuesto> items = presupuesto == null ? List.of()
				: itemPresupuestoRepository.findByPresupuestoIdOrderByOrdenAsc(presupuesto.getId());
		Map<Long, Double> pesos = pesos(hojas, items);
		double pesoTotal = pesos.values().stream().mapToDouble(Double::doubleValue).sum();

		boolean lineaBase = proyecto.getLineaBaseFecha() != null;
		double avancePlan = ponderado(hojas, pesos, pesoTotal, t -> fraccion(t.getFechaInicio(), t.getFechaFin(), hoy));
		double avanceReal = ponderado(hojas, pesos, pesoTotal, t -> avance(t) / 100.0);
		Double spi = avancePlan > 0 ? redondear(avanceReal / avancePlan) : null;

		BigDecimal total = presupuesto == null || presupuesto.getTotal() == null ? BigDecimal.ZERO : presupuesto.getTotal();
		List<CostoReal> costos = costoRealRepository.findByProyectoIdOrderByFechaDescIdDesc(id);
		BigDecimal costoReal = CostoRealService.total(costos);
		BigDecimal valorGanado = total.multiply(BigDecimal.valueOf(avanceReal)).setScale(2, RoundingMode.HALF_UP);
		Double cpi = costoReal.signum() > 0 ? redondear(valorGanado.doubleValue() / costoReal.doubleValue()) : null;
		BigDecimal costoProyectado = avanceReal > 0
				? costoReal.multiply(BigDecimal.valueOf(1 / avanceReal)).setScale(2, RoundingMode.HALF_UP)
				: null;

		List<ComparacionRubro> rubros = rubros(items, costos);
		List<Certificacion> certificaciones = certificacionRepository.findByProyectoIdOrderByNumeroAsc(id);
		ResumenCertificacion certificacion = CertificacionService.resumen(presupuesto == null ? null : total,
				certificaciones);
		Plazo plazo = plazo(proyecto, presupuesto, hojas, lineaBase, hoy);

		List<PuntoCurvaS> curva = detalle ? curvaS(hojas, pesos, pesoTotal, plazo, lineaBase, hoy) : List.of();
		List<DesvioTarea> desvios = detalle && lineaBase ? desvios(hojas, hoy) : List.of();
		List<Alerta> alertas = alertas(proyecto, !tareas.isEmpty(), lineaBase, plazo, avanceReal, rubros,
				certificacion, certificaciones, hoy);

		return new Indicadores(id, proyecto.getNombre(), lineaBase, plazo, redondear(avancePlan * 100),
				redondear(avanceReal * 100), spi, cpi, total, costoReal, valorGanado, costoProyectado, rubros,
				certificacion, curva, desvios, alertas);
	}

	// Monto del presupuesto de cada tarea hoja (los renglones de capítulo/grupo apuntan a su tarea).
	private static Map<Long, Double> pesos(List<Tarea> hojas, List<ItemPresupuesto> items) {
		Map<Long, Double> montoPorTarea = new HashMap<>();
		for (ItemPresupuesto item : items) {
			if (item.getTarea() != null && item.getTotal() != null) {
				montoPorTarea.merge(item.getTarea().getId(), item.getTotal().doubleValue(), Double::sum);
			}
		}
		boolean hayMontos = hojas.stream().anyMatch(t -> montoPorTarea.getOrDefault(t.getId(), 0.0) > 0);
		return hojas.stream().collect(Collectors.toMap(Tarea::getId,
				t -> hayMontos ? montoPorTarea.getOrDefault(t.getId(), 0.0) : 1.0));
	}

	private static double ponderado(List<Tarea> hojas, Map<Long, Double> pesos, double pesoTotal,
			Function<Tarea, Double> valor) {
		if (pesoTotal == 0) {
			return 0;
		}
		return hojas.stream().mapToDouble(t -> pesos.get(t.getId()) * valor.apply(t)).sum() / pesoTotal;
	}

	private static int avance(Tarea tarea) {
		if (tarea.getAvance() != null) {
			return tarea.getAvance();
		}
		return tarea.getEstado() == EstadoTarea.COMPLETADA ? 100 : 0;
	}

	// Qué parte de [inicio, fin] ya pasó a la fecha (0 a 1, contando el día de inicio y el de fin).
	private static double fraccion(LocalDate inicio, LocalDate fin, LocalDate fecha) {
		if (inicio == null || fin == null || fecha.isBefore(inicio)) {
			return 0;
		}
		if (!fecha.isBefore(fin)) {
			return 1;
		}
		return (ChronoUnit.DAYS.between(inicio, fecha) + 1.0) / (ChronoUnit.DAYS.between(inicio, fin) + 1.0);
	}

	// Fin estimado de una tarea: el fin estimado/real cargado; si no tiene y ya venció sin
	// terminar, hoy; si no, el fin plan.
	private static LocalDate finEstimado(Tarea tarea, LocalDate hoy) {
		if (tarea.getFechaFinReal() != null) {
			return tarea.getFechaFinReal();
		}
		if (tarea.getFechaFin() != null && hoy.isAfter(tarea.getFechaFin()) && avance(tarea) < 100) {
			return hoy;
		}
		return tarea.getFechaFin();
	}

	private static Plazo plazo(Proyecto proyecto, Presupuesto presupuesto, List<Tarea> hojas, boolean lineaBase,
			LocalDate hoy) {
		// Con la línea base fijada, el plan es el de las tareas (contra eso se mide el avance); si
		// no, o si las tareas no tienen fechas, las fechas del proyecto (el plazo cotizado).
		LocalDate inicioTareas = minimo(hojas.stream().map(Tarea::getFechaInicio).toList());
		LocalDate finTareas = maximo(hojas.stream().map(Tarea::getFechaFin).toList());
		boolean planDeTareas = lineaBase && inicioTareas != null && finTareas != null;
		LocalDate inicioPlan = planDeTareas || proyecto.getFechaInicio() == null ? inicioTareas : proyecto.getFechaInicio();
		LocalDate finPlan = planDeTareas || proyecto.getFechaFin() == null ? finTareas : proyecto.getFechaFin();
		LocalDate inicioReal = minimo(hojas.stream().map(Tarea::getFechaInicioReal).toList());
		LocalDate finEstimado = lineaBase ? maximo(hojas.stream().map(t -> finEstimado(t, hoy)).toList()) : finPlan;
		if (finEstimado == null) {
			finEstimado = finPlan;
		}
		LocalDate desde = inicioReal != null ? inicioReal : inicioPlan;
		return new Plazo(inicioPlan, finPlan, inicioReal, finEstimado, dias(inicioPlan, finPlan), dias(desde, finEstimado),
				dias(finPlan, finEstimado), presupuesto == null ? null : presupuesto.getPlazoDias());
	}

	private static List<ComparacionRubro> rubros(List<ItemPresupuesto> items, List<CostoReal> costos) {
		Map<Rubro, BigDecimal> cotizado = new EnumMap<>(Rubro.class);
		for (Rubro r : Rubro.values()) {
			cotizado.put(r, BigDecimal.ZERO);
		}
		for (ItemPresupuesto item : items) {
			if (item.getTipo() == TipoItemPresupuesto.CAPITULO) {
				cotizado.merge(Rubro.MANO_OBRA, cero(item.getManoObra()), BigDecimal::add);
				cotizado.merge(Rubro.EQUIPOS, cero(item.getEquipos()), BigDecimal::add);
				cotizado.merge(Rubro.MATERIALES, cero(item.getMateriales()), BigDecimal::add);
				cotizado.merge(Rubro.TERCEROS, cero(item.getTerceros()), BigDecimal::add);
			}
		}
		Map<Rubro, BigDecimal> real = costos.stream().collect(Collectors.groupingBy(CostoReal::getRubro,
				() -> new EnumMap<>(Rubro.class), Collectors.reducing(BigDecimal.ZERO, CostoReal::getMonto, BigDecimal::add)));
		List<ComparacionRubro> resultado = new ArrayList<>();
		for (Rubro r : Rubro.values()) {
			BigDecimal plan = cotizado.get(r);
			BigDecimal gastado = real.getOrDefault(r, BigDecimal.ZERO);
			double consumido = plan.signum() == 0 ? (gastado.signum() > 0 ? 100 : 0)
					: redondear(gastado.doubleValue() * 100 / plan.doubleValue());
			resultado.add(new ComparacionRubro(r, plan, gastado, gastado.subtract(plan), consumido));
		}
		return resultado;
	}

	// Curva S: hasta ~30 puntos repartidos (diarios en obras cortas, más espaciados en las largas) desde el
	// primer inicio hasta el último fin, más el día de hoy. El real llega sólo hasta hoy: cada
	// tarea sube en línea recta desde su inicio real hasta su avance actual.
	private static List<PuntoCurvaS> curvaS(List<Tarea> hojas, Map<Long, Double> pesos, double pesoTotal, Plazo plazo,
			boolean lineaBase, LocalDate hoy) {
		LocalDate desde = minimo(Arrays.asList(plazo.inicioPlan(), plazo.inicioReal()));
		LocalDate hasta = maximo(Arrays.asList(plazo.finPlan(), plazo.finEstimado()));
		if (desde == null || hasta == null || hasta.isBefore(desde) || pesoTotal == 0) {
			return List.of();
		}
		long dias = ChronoUnit.DAYS.between(desde, hasta);
		long paso = Math.max(1, (long) Math.ceil(dias / 30.0));
		TreeSet<LocalDate> fechas = new TreeSet<>();
		for (LocalDate f = desde; !f.isAfter(hasta); f = f.plusDays(paso)) {
			fechas.add(f);
		}
		fechas.add(hasta);
		if (hoy.isAfter(desde) && hoy.isBefore(hasta)) {
			fechas.add(hoy);
		}
		List<PuntoCurvaS> puntos = new ArrayList<>();
		for (LocalDate f : fechas) {
			double plan = ponderado(hojas, pesos, pesoTotal, t -> fraccion(t.getFechaInicio(), t.getFechaFin(), f));
			Double real = lineaBase && !f.isAfter(hoy)
					? redondear(ponderado(hojas, pesos, pesoTotal, t -> avanceRealAl(t, f, hoy)) * 100)
					: null;
			puntos.add(new PuntoCurvaS(f, redondear(plan * 100), real));
		}
		return puntos;
	}

	private static double avanceRealAl(Tarea tarea, LocalDate fecha, LocalDate hoy) {
		double avance = avance(tarea) / 100.0;
		LocalDate inicio = tarea.getFechaInicioReal() != null ? tarea.getFechaInicioReal() : tarea.getFechaInicio();
		if (avance == 0 || inicio == null) {
			return avance;
		}
		LocalDate fin = tarea.getFechaFinReal() != null && tarea.getFechaFinReal().isBefore(hoy) ? tarea.getFechaFinReal() : hoy;
		if (fin.isBefore(inicio)) {
			fin = inicio;
		}
		return avance * fraccion(inicio, fin, fecha);
	}

	private static List<DesvioTarea> desvios(List<Tarea> hojas, LocalDate hoy) {
		return hojas.stream()
				.filter(t -> t.getFechaFin() != null)
				.map(t -> new DesvioTarea(t.getId(), t.getNumero(), t.getNombre(), t.getFechaFin(), finEstimado(t, hoy),
						ChronoUnit.DAYS.between(t.getFechaFin(), finEstimado(t, hoy)), avance(t)))
				.filter(d -> d.desvioDias() > 0)
				.sorted(Comparator.comparingLong(DesvioTarea::desvioDias).reversed())
				.toList();
	}

	private static List<Alerta> alertas(Proyecto proyecto, boolean hayTareas, boolean lineaBase, Plazo plazo,
			double avanceReal, List<ComparacionRubro> rubros, ResumenCertificacion cert,
			List<Certificacion> certificaciones, LocalDate hoy) {
		List<Alerta> alertas = new ArrayList<>();
		boolean terminada = proyecto.getEstado() == EstadoProyecto.FINALIZADO || avanceReal >= 0.95;

		if (hayTareas && !lineaBase) {
			alertas.add(new Alerta(NivelAlerta.INFO, "Línea base sin fijar",
					"Fijá la línea base en la solapa Carga de fechas para medir el avance real contra el plan."));
		}
		Long desvio = plazo.desvioDias();
		if (lineaBase && desvio != null && desvio > 0) {
			alertas.add(new Alerta(desvio > 7 ? NivelAlerta.CRITICA : NivelAlerta.ADVERTENCIA,
					"Atraso de " + desvio + (desvio == 1 ? " día" : " días"),
					"Fin estimado " + FECHA.format(plazo.finEstimado()) + " contra " + FECHA.format(plazo.finPlan())
							+ " de la línea base."));
		} else if (lineaBase && desvio != null && desvio < 0) {
			alertas.add(new Alerta(NivelAlerta.INFO, "Adelanto de " + -desvio + (desvio == -1 ? " día" : " días"),
					"Rendimiento positivo: el fin estimado es anterior al plan."));
		}

		for (ComparacionRubro r : rubros) {
			String rubro = RUBRO_LABEL.get(r.rubro());
			if (r.presupuestado().signum() > 0 && r.real().compareTo(r.presupuestado()) > 0) {
				alertas.add(new Alerta(NivelAlerta.CRITICA, rubro + " excedido",
						"Se gastaron " + pesos(r.real()) + " de " + pesos(r.presupuestado()) + " cotizados (+"
								+ Math.round(r.porcentajeConsumido() - 100) + " %)."));
			} else if (r.presupuestado().signum() > 0 && r.porcentajeConsumido() >= 90 && avanceReal < 0.9) {
				alertas.add(new Alerta(NivelAlerta.ADVERTENCIA, rubro + " cerca del límite",
						"Va el " + Math.round(r.porcentajeConsumido()) + " % de lo cotizado con un avance de "
								+ Math.round(avanceReal * 100) + " %."));
			} else if (r.presupuestado().signum() == 0 && r.real().signum() > 0) {
				alertas.add(new Alerta(NivelAlerta.ADVERTENCIA, rubro + " sin cotizar",
						"Hay " + pesos(r.real()) + " de gastos en un rubro que no estaba en el presupuesto."));
			}
		}

		if (cert.montoContrato() != null && cert.montoContrato().signum() > 0) {
			if (terminada && cert.saldoPorCertificar().signum() > 0) {
				alertas.add(new Alerta(NivelAlerta.CRITICA, "Saldo sin certificar",
						"Queda " + pesos(cert.saldoPorCertificar()) + " (" + Math.round(100 - cert.porcentajeCertificado())
								+ " % del contrato) por certificar y la obra está terminada."));
			}
			if (lineaBase && certificaciones.isEmpty()) {
				alertas.add(new Alerta(NivelAlerta.ADVERTENCIA, "Sin anticipo",
						"La obra no tiene certificaciones: normalmente arranca con un anticipo del 30 %."));
			} else if (lineaBase && !terminada && cert.diasDesdeUltima() != null
					&& cert.diasDesdeUltima() > DIAS_ALERTA_CERTIFICACION) {
				alertas.add(new Alerta(NivelAlerta.ADVERTENCIA, "Sin certificar hace " + cert.diasDesdeUltima() + " días",
						"Las obras se certifican cada 2 o 3 meses según el avance."));
			}
			double sinCertificar = avanceReal * 100 - cert.porcentajeCertificado();
			if (!terminada && sinCertificar > 15) {
				alertas.add(new Alerta(NivelAlerta.ADVERTENCIA, "Avance sin certificar",
						"La obra avanzó " + Math.round(avanceReal * 100) + " % y se certificó "
								+ Math.round(cert.porcentajeCertificado()) + " %: hay trabajo hecho sin facturar."));
			}
		}
		List<Certificacion> atrasadas = certificaciones.stream()
				.filter(c -> c.getEstado() == EstadoCertificacion.PENDIENTE_COBRO)
				.filter(c -> ChronoUnit.DAYS.between(c.getFechaEmision(), hoy) > DIAS_ALERTA_COBRO)
				.toList();
		if (!atrasadas.isEmpty()) {
			alertas.add(new Alerta(NivelAlerta.ADVERTENCIA,
					atrasadas.size() == 1 ? "1 certificación sin cobrar" : atrasadas.size() + " certificaciones sin cobrar",
					"Emitidas hace más de " + DIAS_ALERTA_COBRO + " días: "
							+ pesos(atrasadas.stream().map(Certificacion::getMonto).reduce(BigDecimal.ZERO, BigDecimal::add))
							+ " pendientes de cobro."));
		}
		alertas.sort(Comparator.comparing(Alerta::nivel).reversed());
		return alertas;
	}

	private static Long dias(LocalDate desde, LocalDate hasta) {
		return desde == null || hasta == null ? null : ChronoUnit.DAYS.between(desde, hasta);
	}

	private static LocalDate minimo(List<LocalDate> fechas) {
		return fechas.stream().filter(Objects::nonNull).min(Comparator.naturalOrder()).orElse(null);
	}

	private static LocalDate maximo(List<LocalDate> fechas) {
		return fechas.stream().filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
	}

	private static BigDecimal cero(BigDecimal valor) {
		return valor == null ? BigDecimal.ZERO : valor;
	}

	private static double redondear(double valor) {
		return Math.round(valor * 100) / 100.0;
	}

	private static String pesos(BigDecimal valor) {
		NumberFormat formato = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("es-AR"));
		formato.setMaximumFractionDigits(0);
		return formato.format(valor);
	}
}
