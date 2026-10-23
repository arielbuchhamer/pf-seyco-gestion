package com.seyco.gestion.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;

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

	public CertificacionService(CertificacionRepository certificacionRepository,
			PresupuestoRepository presupuestoRepository, ProyectoService proyectoService) {
		this.certificacionRepository = certificacionRepository;
		this.presupuestoRepository = presupuestoRepository;
		this.proyectoService = proyectoService;
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
		return certificacionRepository.save(certificacion);
	}

	public Certificacion actualizar(Long proyectoId, Long id, Certificacion cambios) {
		Certificacion certificacion = buscar(proyectoId, id);
		copiar(cambios, certificacion, montoContrato(proyectoId));
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
		return certificacionRepository.save(certificacion);
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
		BigDecimal base = contrato == null ? BigDecimal.ZERO : contrato;
		LocalDate ultima = certificaciones.stream().map(Certificacion::getFechaEmision)
				.max(Comparator.naturalOrder()).orElse(null);
		return new ResumenCertificacion(contrato, certificado, cobrado, certificado.subtract(cobrado),
				base.subtract(certificado).max(BigDecimal.ZERO), base.subtract(cobrado).max(BigDecimal.ZERO),
				porcentaje(certificado, base), porcentaje(cobrado, base), ultima,
				ultima == null ? null : ChronoUnit.DAYS.between(ultima, LocalDate.now()));
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
