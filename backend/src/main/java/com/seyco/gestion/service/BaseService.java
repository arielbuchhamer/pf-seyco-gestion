package com.seyco.gestion.service;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

// Operaciones comunes a todos los services de entidad simple (repository CRUD directo).
// Los services concretos exponen el repository y el mensaje de "no encontrado" propio,
// y pueden sobreescribir crear()/eliminar() para agregar validaciones antes de delegar acá con super.
public abstract class BaseService<T, ID> {

	private final String mensajeNoEncontrado;

	protected BaseService(String mensajeNoEncontrado) {
		this.mensajeNoEncontrado = mensajeNoEncontrado;
	}

	protected abstract JpaRepository<T, ID> getRepository();

	public List<T> listar() {
		return getRepository().findAll();
	}

	public T buscarPorId(ID id) {
		return getRepository().findById(id)
				.orElseThrow(() -> ServiceException.noEncontrado(mensajeNoEncontrado));
	}

	public T crear(T entidad) {
		return getRepository().save(entidad);
	}

	public void eliminar(ID id) {
		T existente = buscarPorId(id);
		getRepository().delete(existente);
	}
}
