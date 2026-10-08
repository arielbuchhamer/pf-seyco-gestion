package com.seyco.gestion.service;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.seyco.gestion.entity.Panel;
import com.seyco.gestion.repository.PanelRepository;

// Catálogo de paneles (pantallas del front). El nombre se guarda en minúsculas: es el que
// usan los panelGuard de app.routes.ts y el menú del front.
@Service
public class PanelService extends BaseService<Panel, Long> {

	private final PanelRepository panelRepository;

	public PanelService(PanelRepository panelRepository) {
		super("El panel no existe.");
		this.panelRepository = panelRepository;
	}

	@Override
	protected JpaRepository<Panel, Long> getRepository() {
		return panelRepository;
	}

	@Override
	public List<Panel> listar() {
		return panelRepository.findAllByOrderByIdAsc();
	}

	@Override
	@Transactional
	public Panel crear(Panel nuevo) {
		nuevo.setNombre(ModuloService.validarNombre(nuevo.getNombre()));
		if (panelRepository.existsByNombreIgnoreCase(nuevo.getNombre())) {
			throw ServiceException.conflicto("Ya existe un panel con ese nombre.");
		}
		nuevo.setId(null);
		return panelRepository.save(nuevo);
	}

	@Transactional
	public Panel actualizar(Long id, Panel cambios) {
		Panel existente = buscarPorId(id);
		String nombre = ModuloService.validarNombre(cambios.getNombre());
		if (panelRepository.existsByNombreIgnoreCaseAndIdNot(nombre, id)) {
			throw ServiceException.conflicto("Ya existe un panel con ese nombre.");
		}
		existente.setNombre(nombre);
		return panelRepository.save(existente);
	}
}
