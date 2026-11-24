package com.seyco.gestion.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.seyco.gestion.dto.SeguimientoDtos.ActualizacionCac;
import com.seyco.gestion.dto.SeguimientoDtos.CertificacionActualizada;
import com.seyco.gestion.dto.SeguimientoDtos.ResumenCertificacion;
import com.seyco.gestion.entity.Certificacion;
import com.seyco.gestion.entity.EstadoCertificacion;
import com.seyco.gestion.entity.Presupuesto;
import com.seyco.gestion.entity.Proyecto;
import com.seyco.gestion.entity.TipoCertificacion;
import com.seyco.gestion.repository.CertificacionRepository;
import com.seyco.gestion.repository.PresupuestoRepository;

// Certificaciones de obra (solapa Certificaciones): anticipo, avances y final. El monto del
// contrato es el total del presupuesto importado; si se carga sólo el porcentaje, el monto se
// calcula sobre él.
@Service
public class CertificacionService {

	private static final BigDecimal CIEN = BigDecimal.valueOf(100);

	private final CertificacionRepository certificacionRepository;
	private final PresupuestoRepository presupuestoRepository;
	private final ProyectoService proyectoService;
	private final IndiceCacService indiceCac;

	public CertificacionService(CertificacionRepository certificacionRepository,
			PresupuestoRepository presupuestoRepository, ProyectoService proyectoService, IndiceCacService indiceCac) {
		this.certificacionRepository = certificacionRepository;
		this.presupuestoRepository = presupuestoRepository;
		this.proyectoService = proyectoService;
		this.indiceCac = indiceCac;
	}

	public List<Certificacion> listar(Long proyectoId) {
		proyectoService.buscarPorId(proyectoId);
		return certificacionRepository.findByProyectoIdOrderByNumeroAsc(proyectoId);
	}

	public Certificacion crear(Long proyectoId, Certificacion nueva) {
		Proyecto proyecto = proyectoService.buscarPorId(proyectoId);
		int siguiente = certificacionRepository.findByProyectoIdOrderByNumeroAsc(proyectoId).stream()
				.mapToInt(Certificacion::getNumero).max().orElse(0) + 1;
		Certificacion certificacion = new Certificacion();
		certificacion.setProyecto(proyecto);
		certificacion.setNumero(siguiente);
		copiar(nueva, certificacion, montoContrato(proyectoId));
		congelarSiCobrada(certificacion, true);
		return certificacionRepository.save(certificacion);
	}

	public Certificacion actualizar(Long proyectoId, Long id, Certificacion cambios) {
		Certificacion certificacion = buscar(proyectoId, id);
		BigDecimal montoAntes = certificacion.getMonto();
		LocalDate cobroAntes = certificacion.getFechaCobro();
		copiar(cambios, certificacion, montoContrato(proyectoId));
		boolean cambio = montoAntes.compareTo(certificacion.getMonto()) != 0
				|| !Objects.equals(cobroAntes, certificacion.getFechaCobro());
		congelarSiCobrada(certificacion, cambio || certificacion.getMontoCobrado() == null);
		return certificacionRepository.save(certificacion);
	}

	// Marca la certificación como cobrada (botón "Registrar cobro").
	public Certificacion registrarCobro(Long proyectoId, Long id, LocalDate fecha) {
		Certificacion certificacion = buscar(proyectoId, id);
		LocalDate fechaCobro = fecha != null ? fecha : LocalDate.now();
		if (fechaCobro.isBefore(certificacion.getFechaEmision())) {
			throw ServiceException.datosInvalidos("El cobro no puede ser anterior a la emisión.");
		}
		certificacion.setEstado(EstadoCertificacion.COBRADA);
		certificacion.setFechaCobro(fechaCobro);
		congelarSiCobrada(certificacion, true);
		return certificacionRepository.save(certificacion);
	}

	/*
	 * ACTUALIZACIÓN POR ÍNDICE CAC de lo pendiente de cobro.
	 * El presupuesto se cotizó a precios del mes de su fecha; lo que se cobra después se lleva a
	 * valores de hoy: monto × CAC actual / CAC del mes del presupuesto. Si el CAC de este mes todavía
	 * no se publicó, se usa el del mes anterior (el último disponible).
	 * El anticipo congela precio: la parte cobrada como anticipo no se actualiza. Por eso el monto de
	 * un avance es neto del anticipo (ej. ítem de $30 con anticipo del 30 % -> se certifican $21 y,
	 * con un CAC 10 % más alto, se cobran $23,10). Las cobradas no se tocan.
	 */
	public ActualizacionCac actualizacionCac(Long proyectoId) {
		Proyecto proyecto = proyectoService.buscarPorId(proyectoId);
		List<Certificacion> certificaciones = certificacionRepository.findByProyectoIdOrderByNumeroAsc(proyectoId);
		BigDecimal contrato = montoContrato(proyectoId);
		double anticipo = certificaciones.stream().filter(c -> c.getTipo() == TipoCertificacion.ANTICIPO)
				.mapToDouble(c -> c.getPorcentaje() != null ? c.getPorcentaje().doubleValue()
						: contrato != null ? porcentaje(c.getMonto(), contrato) : 0)
				.sum();
		List<Certificacion> pendientes = certificaciones.stream()
				.filter(c -> c.getEstado() == EstadoCertificacion.PENDIENTE_COBRO).toList();
		BigDecimal nominal = pendientes.stream().map(Certificacion::getMonto).reduce(BigDecimal.ZERO, BigDecimal::add);

		LocalDate fechaBase = fechaBase(proyecto);
		Optional<IndiceCacService.Indice> base = fechaBase == null ? Optional.empty() : indiceCac.al(fechaBase);
		Optional<IndiceCacService.Indice> actual = indiceCac.hoy();
		if (base.isEmpty() || actual.isEmpty()) {
			String motivo = fechaBase == null ? "El proyecto no tiene fecha de presupuesto ni de inicio."
					: "No se pudo obtener el índice CAC en este momento.";
			return new ActualizacionCac(false, motivo, null, null, null, null, false, 0, anticipo, nominal, null,
					pendientes.stream().map(c -> new CertificacionActualizada(c.getId(), c.getMonto(), null)).toList());
		}
		BigDecimal indiceBase = base.get().valor();
		BigDecimal indiceActual = actual.get().valor();
		List<CertificacionActualizada> filas = pendientes.stream()
				.map(c -> new CertificacionActualizada(c.getId(), c.getMonto(), actualizar(c.getMonto(), indiceBase, indiceActual)))
				.toList();
		BigDecimal actualizado = filas.stream().map(CertificacionActualizada::montoActualizado)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
		double variacion = indiceActual.max(indiceBase).divide(indiceBase, 6, RoundingMode.HALF_UP)
				.subtract(BigDecimal.ONE).multiply(CIEN).setScale(2, RoundingMode.HALF_UP).doubleValue();
		boolean mesPublicado = actual.get().periodo().equals(LocalDate.now().withDayOfMonth(1));
		return new ActualizacionCac(true, null, base.get().periodo(), indiceBase, actual.get().periodo(), indiceActual,
				mesPublicado, variacion, anticipo, nominal, actualizado, filas);
	}

	// Al cobrar, el monto actualizado al mes del cobro queda fijo (montoCobrado) y ya no cambia.
	private void congelarSiCobrada(Certificacion c, boolean recalcular) {
		if (c.getEstado() != EstadoCertificacion.COBRADA) {
			c.setMontoCobrado(null);
			c.setIndiceCac(null);
			c.setCacPeriodo(null);
			return;
		}
		if (!recalcular) {
			return;
		}
		LocalDate fechaBase = fechaBase(c.getProyecto());
		LocalDate cobro = c.getFechaCobro() != null ? c.getFechaCobro() : LocalDate.now();
		Optional<IndiceCacService.Indice> base = fechaBase == null ? Optional.empty() : indiceCac.al(fechaBase);
		Optional<IndiceCacService.Indice> alCobro = indiceCac.al(cobro);
		if (base.isEmpty() || alCobro.isEmpty()) {
			c.setMontoCobrado(c.getMonto()); // sin índice: se cobra el monto nominal
			c.setIndiceCac(null);
			c.setCacPeriodo(null);
			return;
		}
		c.setMontoCobrado(actualizar(c.getMonto(), base.get().valor(), alCobro.get().valor()));
		c.setIndiceCac(alCobro.get().valor());
		c.setCacPeriodo(alCobro.get().periodo());
	}

	// Mes de los precios del presupuesto: la fecha del presupuesto o, si no tiene, el inicio de obra.
	private LocalDate fechaBase(Proyecto proyecto) {
		return presupuestoRepository.findByProyectoId(proyecto.getId()).map(Presupuesto::getFecha)
				.orElse(proyecto.getFechaInicio());
	}

	// Si el presupuesto es de un mes más nuevo que el último índice publicado, no se actualiza.
	private static BigDecimal actualizar(BigDecimal monto, BigDecimal indiceBase, BigDecimal indiceActual) {
		if (indiceActual.compareTo(indiceBase) <= 0) {
			return monto.setScale(2, RoundingMode.HALF_UP);
		}
		return monto.multiply(indiceActual).divide(indiceBase, 2, RoundingMode.HALF_UP);
	}

	public void eliminar(Long proyectoId, Long id) {
		certificacionRepository.delete(buscar(proyectoId, id));
	}

	public ResumenCertificacion resumen(Long proyectoId) {
		return resumen(montoContrato(proyectoId), certificacionRepository.findByProyectoIdOrderByNumeroAsc(proyectoId));
	}

	static ResumenCertificacion resumen(BigDecimal contrato, List<Certificacion> certificaciones) {
		BigDecimal certificado = certificaciones.stream().map(Certificacion::getMonto)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
		BigDecimal cobrado = certificaciones.stream().filter(c -> c.getEstado() == EstadoCertificacion.COBRADA)
				.map(Certificacion::getMonto).reduce(BigDecimal.ZERO, BigDecimal::add);
		BigDecimal cobradoPesos = certificaciones.stream().filter(c -> c.getEstado() == EstadoCertificacion.COBRADA)
				.map(c -> c.getMontoCobrado() != null ? c.getMontoCobrado() : c.getMonto())
				.reduce(BigDecimal.ZERO, BigDecimal::add);
		BigDecimal base = contrato == null ? BigDecimal.ZERO : contrato;
		LocalDate ultima = certificaciones.stream().map(Certificacion::getFechaEmision)
				.max(Comparator.naturalOrder()).orElse(null);
		return new ResumenCertificacion(contrato, certificado, cobrado, certificado.subtract(cobrado),
				base.subtract(certificado).max(BigDecimal.ZERO), base.subtract(cobrado).max(BigDecimal.ZERO),
				porcentaje(certificado, base), porcentaje(cobrado, base), ultima,
				ultima == null ? null : ChronoUnit.DAYS.between(ultima, LocalDate.now()), cobradoPesos);
	}

	BigDecimal montoContrato(Long proyectoId) {
		return presupuestoRepository.findByProyectoId(proyectoId).map(Presupuesto::getTotal).orElse(null);
	}

	private Certificacion buscar(Long proyectoId, Long id) {
		return certificacionRepository.findById(id)
				.filter(c -> c.getProyecto().getId().equals(proyectoId))
				.orElseThrow(() -> ServiceException.noEncontrado("La certificación no existe."));
	}

	private static void copiar(Certificacion origen, Certificacion destino, BigDecimal contrato) {
		BigDecimal monto = origen.getMonto();
		BigDecimal porcentaje = origen.getPorcentaje();
		if (porcentaje != null && (porcentaje.signum() <= 0 || porcentaje.compareTo(CIEN) > 0)) {
			throw ServiceException.datosInvalidos("El porcentaje va de 0 a 100 %.");
		}
		if (monto == null && porcentaje != null && contrato != null) {
			monto = contrato.multiply(porcentaje).divide(CIEN, 2, RoundingMode.HALF_UP);
		}
		if (monto == null || monto.signum() <= 0) {
			throw ServiceException.datosInvalidos("Cargá el monto (o el porcentaje del contrato) de la certificación.");
		}
		if (porcentaje == null && contrato != null && contrato.signum() > 0) {
			porcentaje = monto.multiply(CIEN).divide(contrato, 2, RoundingMode.HALF_UP);
		}
		LocalDate emision = origen.getFechaEmision() != null ? origen.getFechaEmision() : LocalDate.now();
		EstadoCertificacion estado = origen.getEstado() != null ? origen.getEstado() : EstadoCertificacion.PENDIENTE_COBRO;
		LocalDate cobro = estado == EstadoCertificacion.COBRADA
				? (origen.getFechaCobro() != null ? origen.getFechaCobro() : emision)
				: null;
		if (cobro != null && cobro.isBefore(emision)) {
			throw ServiceException.datosInvalidos("El cobro no puede ser anterior a la emisión.");
		}

		destino.setTipo(origen.getTipo() != null ? origen.getTipo() : TipoCertificacion.AVANCE);
		destino.setFechaEmision(emision);
		destino.setMonto(monto.setScale(2, RoundingMode.HALF_UP));
		destino.setPorcentaje(porcentaje);
		destino.setNroFactura(vacioANull(origen.getNroFactura()));
		destino.setObservaciones(vacioANull(origen.getObservaciones()));
		destino.setEstado(estado);
		destino.setFechaCobro(cobro);
	}

	private static double porcentaje(BigDecimal parte, BigDecimal total) {
		return total.signum() == 0 ? 0 : parte.multiply(CIEN).divide(total, 2, RoundingMode.HALF_UP).doubleValue();
	}

	private static String vacioANull(String texto) {
		return texto == null || texto.isBlank() ? null : texto.trim();
	}
}
