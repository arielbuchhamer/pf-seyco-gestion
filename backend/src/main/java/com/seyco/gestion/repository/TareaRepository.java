package com.seyco.gestion.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.seyco.gestion.entity.Tarea;

public interface TareaRepository extends JpaRepository<Tarea, Long> {

	List<Tarea> findByProyectoId(Long proyectoId);
}
