package com.seyco.gestion.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.seyco.gestion.entity.HistorialEstadoTarea;

public interface HistorialEstadoTareaRepository extends JpaRepository<HistorialEstadoTarea, Long> {

	List<HistorialEstadoTarea> findByTareaIdOrderByFechaHoraAsc(Long tareaId);
}
