package com.seyco.gestion.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.seyco.gestion.entity.EstadoProyecto;
import com.seyco.gestion.entity.Proyecto;

public interface ProyectoRepository extends JpaRepository<Proyecto, Long> {

	Optional<Proyecto> findByNombre(String nombre);

	List<Proyecto> findByNombreContainingIgnoreCaseAndEstado(String nombre, EstadoProyecto estado);

	List<Proyecto> findByNombreContainingIgnoreCase(String nombre);

	List<Proyecto> findByEstado(EstadoProyecto estado);
}
