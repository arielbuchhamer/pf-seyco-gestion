package com.seyco.gestion.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.seyco.gestion.entity.Proyecto;

public interface ProyectoRepository extends JpaRepository<Proyecto, Long> {

	Optional<Proyecto> findByNombre(String nombre);
}
