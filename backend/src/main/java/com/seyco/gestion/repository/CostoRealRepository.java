package com.seyco.gestion.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.seyco.gestion.entity.CostoReal;

public interface CostoRealRepository extends JpaRepository<CostoReal, Long> {

	List<CostoReal> findByProyectoIdOrderByFechaDescIdDesc(Long proyectoId);
}
