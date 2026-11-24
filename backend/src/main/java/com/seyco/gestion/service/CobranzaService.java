package com.seyco.gestion.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.seyco.gestion.dto.SeguimientoDtos.ActualizacionCac;
import com.seyco.gestion.dto.SeguimientoDtos.Cobranzas;
import com.seyco.gestion.dto.SeguimientoDtos.FacturaPendiente;
import com.seyco.gestion.dto.SeguimientoDtos.Indicadores;
import com.seyco.gestion.dto.SeguimientoDtos.NivelAlerta;
import com.seyco.gestion.dto.SeguimientoDtos.ObraCobranza;
import com.seyco.gestion.dto.SeguimientoDtos.ResumenCertificacion;
import com.seyco.gestion.entity.Certificacion;
import com.seyco.gestion.entity.EstadoCertificacion;
import com.seyco.gestion.entity.EstadoProyecto;
import com.seyco.gestion.entity.Proyecto;
import com.seyco.gestion.repository.CertificacionRepository;
import com.seyco.gestion.repository.ProyectoRepository;

/*
 * COBRANZAS (Gestión global): en una sola pantalla, toda la plata que falta entrar en todas las
 * obras, para que no se pierda el saldo final que "nadie sigue".
 *   obras    -> las que tienen algo sin certificar o sin cobrar, primero las más urgentes:
 *               CRITICA     obra terminada con saldo sin certificar (el 15 % que se pierde)
 *               ADVERTENCIA facturas con más de 60 días sin cobrar, avance sin certificar (> 15 %)
 *                           o más de 90 días sin certificar
 *   facturas -> certificaciones emitidas y no cobradas, de la más vieja a la más nueva
 * Mismos criterios que las alertas de cada obra (IndicadoresService).
 */
@Service
public class CobranzaService {

	private static final int DIAS_ALERTA_COBRO = 60;
	private static final int DIAS_ALERTA_CERTIFICACION = 90;

	private final ProyectoRepository proyectoRepository;
	private final CertificacionRepository certificacionRepository;
	private final IndicadoresService indicadoresService;
	private final CertificacionService certificacionService;

	public CobranzaService(ProyectoRepository proyectoRepository, CertificacionRepository certificacionRepository,
			IndicadoresService indicadoresService, CertificacionService certificacionService) {
		this.proyectoRepository = proyectoRepository;
		this.certificacionRepository = certificacionRepository;
		this.indicadoresService = indicadoresService;
		this.certificacionService = certificacionService;
	}

	public Cobranzas cobranzas() {
		LocalDate hoy = LocalDate.now();
		List<ObraCobranza> obras = new ArrayList<>();
		List<FacturaPendiente> facturas = new ArrayList<>();

		for (Proyecto p : proyectoRepository.findAll()) {
			List<Certificacion> certificaciones = certificacionRepository.findByProyectoIdOrderByNumeroAsc(p.getId());
			boolean hayPendientes = certificaciones.stream().anyMatch(c -> c.getEstado() == EstadoCertificacion.PENDIENTE_COBRO);
			// Lo pendiente llevado a hoy con el índice CAC (mismo cálculo que la solapa Certificaciones).
			ActualizacionCac cac = hayPendientes ? certificacionService.actualizacionCac(p.getId()) : null;
			Map<Long, BigDecimal> actualizados = new HashMap<>();
			if (cac != null && cac.disponible()) {
				cac.certificaciones().forEach(a -> actualizados.put(a.certificacionId(), a.montoActualizado()));
			}
			LocalDate periodoCac = cac != null && cac.disponible() ? cac.periodoActual() : null;
			List<FacturaPendiente> pendientes = certificaciones.stream()
					.filter(c -> c.getEstado() == EstadoCertificacion.PENDIENTE_COBRO)
					.map(c -> new FacturaPendiente(p.getId(), p.getNombre(), c.getId(), c.getNumero(), c.getTipo(),
							c.getFechaEmision(), c.getNroFactura(), c.getMonto(),
							ChronoUnit.DAYS.between(c.getFechaEmision(), hoy), actualizados.get(c.getId()), periodoCac))
					.toList();
			facturas.addAll(pendientes);

			Indicadores i = indicadoresService.calcular(p, false, hoy);
			ResumenCertificacion cert = i.certificacion();
			if (cert.montoContrato() == null || cert.saldoPorCobrar().signum() <= 0) {
				continue;
			}
			boolean terminada = p.getEstado() == EstadoProyecto.FINALIZADO || i.avanceReal() >= 95;
			obras.add(obra(p, i, cert, terminada, pendientes));
		}

		obras.sort(Comparator.comparing(ObraCobranza::nivel).reversed()
				.thenComparing(o -> o.certificacion().saldoPorCobrar(), Comparator.reverseOrder()));
		facturas.sort(Comparator.comparingLong(FacturaPendiente::dias).reversed());

		BigDecimal sinCertificar = sumar(obras, false);
		BigDecimal sinCertificarTerminadas = sumar(obras, true);
		BigDecimal facturadoSinCobrar = facturas.stream().map(FacturaPendiente::monto).reduce(BigDecimal.ZERO,
				BigDecimal::add);
		// Si alguna factura no se pudo actualizar (sin índice), se toma su monto original.
		BigDecimal facturadoCac = facturas.stream().anyMatch(f -> f.montoActualizado() != null)
				? facturas.stream().map(f -> f.montoActualizado() != null ? f.montoActualizado() : f.monto())
						.reduce(BigDecimal.ZERO, BigDecimal::add)
				: null;
		return new Cobranzas(sinCertificar.add(facturadoSinCobrar), facturadoSinCobrar, sinCertificar,
				sinCertificarTerminadas,
				(int) obras.stream().filter(o -> o.terminada() && o.certificacion().saldoPorCertificar().signum() > 0).count(),
				obras, facturas, facturadoCac);
	}

	private static ObraCobranza obra(Proyecto p, Indicadores i, ResumenCertificacion cert, boolean terminada,
			List<FacturaPendiente> pendientes) {
		NivelAlerta nivel = NivelAlerta.INFO;
		String motivo = "Al día";
		long viejas = pendientes.stream().filter(f -> f.dias() > DIAS_ALERTA_COBRO).count();
		double sinCertificar = i.avanceReal() - cert.porcentajeCertificado();

		if (terminada && cert.saldoPorCertificar().signum() > 0) {
			nivel = NivelAlerta.CRITICA;
			motivo = "Obra terminada con " + Math.round(100 - cert.porcentajeCertificado()) + " % sin certificar";
		} else if (viejas > 0) {
			nivel = NivelAlerta.ADVERTENCIA;
			motivo = viejas == 1 ? "1 factura con más de " + DIAS_ALERTA_COBRO + " días sin cobrar"
					: viejas + " facturas con más de " + DIAS_ALERTA_COBRO + " días sin cobrar";
		} else if (!terminada && sinCertificar > 15) {
			nivel = NivelAlerta.ADVERTENCIA;
			motivo = "Avanzó " + Math.round(i.avanceReal()) + " % y se certificó " + Math.round(cert.porcentajeCertificado())
					+ " %";
		} else if (!terminada && cert.diasDesdeUltima() != null && cert.diasDesdeUltima() > DIAS_ALERTA_CERTIFICACION) {
			nivel = NivelAlerta.ADVERTENCIA;
			motivo = "Sin certificar hace " + cert.diasDesdeUltima() + " días";
		} else if (cert.pendienteCobro().signum() > 0) {
			motivo = "Facturado, esperando el cobro";
		} else if (cert.certificado().signum() == 0) {
			motivo = "Todavía sin certificar";
		} else {
			motivo = "Certificando según avance";
		}
		return new ObraCobranza(p.getId(), p.getNombre(), p.getCliente(), p.getTipoCliente(), p.getEstado(),
				i.avanceReal(), terminada, cert, nivel, motivo);
	}

	private static BigDecimal sumar(List<ObraCobranza> obras, boolean soloTerminadas) {
		return obras.stream().filter(o -> !soloTerminadas || o.terminada())
				.map(o -> o.certificacion().saldoPorCertificar()).reduce(BigDecimal.ZERO, BigDecimal::add);
	}
}
