package com.seyco.gestion.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.springframework.stereotype.Service;

import com.seyco.gestion.entity.CostoReal;
import com.seyco.gestion.entity.Proyecto;
import com.seyco.gestion.repository.CostoRealRepository;

// Gastos reales de la obra por rubro (solapa Costos reales). Alimentan la comparación
// cotizado vs. real de IndicadoresService.
@Service
public class CostoRealService {

	private final CostoRealRepository costoRealRepository;
	private final ProyectoService proyectoService;

	public CostoRealService(CostoRealRepository costoRealRepository, ProyectoService proyectoService) {
		this.costoRealRepository = costoRealRepository;
		this.proyectoService = proyectoService;
	}

	public List<CostoReal> listar(Long proyectoId) {
		proyectoService.buscarPorId(proyectoId);
		return costoRealRepository.findByProyectoIdOrderByFechaDescIdDesc(proyectoId);
	}

	public CostoReal crear(Long proyectoId, CostoReal nuevo) {
		Proyecto proyecto = proyectoService.buscarPorId(proyectoId);
		CostoReal costo = new CostoReal();
		costo.setProyecto(proyecto);
		copiar(nuevo, costo);
		return costoRealRepository.save(costo);
	}

	public CostoReal actualizar(Long proyectoId, Long id, CostoReal cambios) {
		CostoReal costo = buscar(proyectoId, id);
		copiar(cambios, costo);
		return costoRealRepository.save(costo);
	}

	public void eliminar(Long proyectoId, Long id) {
		costoRealRepository.delete(buscar(proyectoId, id));
	}

	private CostoReal buscar(Long proyectoId, Long id) {
		return costoRealRepository.findById(id)
				.filter(c -> c.getProyecto().getId().equals(proyectoId))
				.orElseThrow(() -> ServiceException.noEncontrado("El costo no existe."));
	}

	private static void copiar(CostoReal origen, CostoReal destino) {
		if (origen.getFecha() == null) {
			throw ServiceException.datosInvalidos("La fecha es obligatoria.");
		}
		if (origen.getRubro() == null) {
			throw ServiceException.datosInvalidos("El rubro es obligatorio.");
		}
		if (origen.getDescripcion() == null || origen.getDescripcion().isBlank()) {
			throw ServiceException.datosInvalidos("La descripción es obligatoria.");
		}
		if (origen.getMonto() == null || origen.getMonto().signum() <= 0) {
			throw ServiceException.datosInvalidos("El monto tiene que ser mayor a cero.");
		}
		destino.setFecha(origen.getFecha());
		destino.setRubro(origen.getRubro());
		destino.setDescripcion(origen.getDescripcion().trim());
		destino.setComprobante(origen.getComprobante() == null || origen.getComprobante().isBlank() ? null
				: origen.getComprobante().trim());
		destino.setMonto(origen.getMonto().setScale(2, RoundingMode.HALF_UP));
	}

	public static BigDecimal total(List<CostoReal> costos) {
		return costos.stream().map(CostoReal::getMonto).reduce(BigDecimal.ZERO, BigDecimal::add);
	}
}
