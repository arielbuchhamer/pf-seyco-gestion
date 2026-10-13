package com.seyco.gestion.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.seyco.gestion.entity.Presupuesto;

public interface PresupuestoRepository extends JpaRepository<Presupuesto, Long> {

	Optional<Presupuesto> findByProyectoId(Long proyectoId);
}
