package com.seyco.gestion.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.seyco.gestion.entity.ArchivoProyecto;

public interface ArchivoProyectoRepository extends JpaRepository<ArchivoProyecto, Long> {

	Optional<ArchivoProyecto> findByProyectoId(Long proyectoId);
}
