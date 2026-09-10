package com.seyco.gestion.service;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;

import com.seyco.gestion.entity.EstadoProyecto;
import com.seyco.gestion.entity.Proyecto;
import com.seyco.gestion.repository.ProyectoRepository;

@Service
public class ProyectoService extends BaseService<Proyecto, Long> {

	private final ProyectoRepository proyectoRepository;

	public ProyectoService(ProyectoRepository proyectoRepository) {
		super("El proyecto no existe.");
		this.proyectoRepository = proyectoRepository;
	}

	@Override
	protected JpaRepository<Proyecto, Long> getRepository() {
		return proyectoRepository;
	}

	@Override
	public Proyecto crear(Proyecto nuevo) {
		if (proyectoRepository.findByNombre(nuevo.getNombre()).isPresent()) {
			throw ServiceException.conflicto("Ya existe un proyecto con ese nombre.");
		}
		if (nuevo.getEstado() == null) {
			nuevo.setEstado(EstadoProyecto.PLANIFICADO);
		}
		return super.crear(nuevo);
	}
}
