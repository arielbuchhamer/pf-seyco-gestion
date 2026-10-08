package com.seyco.gestion.service;

import java.util.List;
import java.util.Locale;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.seyco.gestion.entity.Modulo;
import com.seyco.gestion.repository.ModuloRepository;

// Catálogo de módulos. El nombre se guarda en minúsculas: es el que se compara con los
// @PreAuthorize("hasAuthority('<modulo>:<accion>')") del backend.
@Service
public class ModuloService extends BaseService<Modulo, Long> {

	private final ModuloRepository moduloRepository;

	public ModuloService(ModuloRepository moduloRepository) {
		super("El módulo no existe.");
		this.moduloRepository = moduloRepository;
	}

	@Override
	protected JpaRepository<Modulo, Long> getRepository() {
		return moduloRepository;
	}

	@Override
	public List<Modulo> listar() {
		return moduloRepository.findAllByOrderByIdAsc();
	}

	@Override
	@Transactional
	public Modulo crear(Modulo nuevo) {
		nuevo.setNombre(validarNombre(nuevo.getNombre()));
		if (moduloRepository.existsByNombreIgnoreCase(nuevo.getNombre())) {
			throw ServiceException.conflicto("Ya existe un módulo con ese nombre.");
		}
		nuevo.setId(null);
		return moduloRepository.save(nuevo);
	}

	@Transactional
	public Modulo actualizar(Long id, Modulo cambios) {
		Modulo existente = buscarPorId(id);
		String nombre = validarNombre(cambios.getNombre());
		if (moduloRepository.existsByNombreIgnoreCaseAndIdNot(nombre, id)) {
			throw ServiceException.conflicto("Ya existe un módulo con ese nombre.");
		}
		existente.setNombre(nombre);
		return moduloRepository.save(existente);
	}

	static String validarNombre(String nombre) {
		if (nombre == null || nombre.isBlank()) {
			throw ServiceException.datosInvalidos("El nombre es obligatorio.");
		}
		String limpio = nombre.trim().toLowerCase(Locale.ROOT);
		if (limpio.length() > 50) {
			throw ServiceException.datosInvalidos("El nombre puede tener hasta 50 caracteres.");
		}
		return limpio;
	}
}
