package com.seyco.gestion.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.seyco.gestion.entity.Certificacion;

public interface CertificacionRepository extends JpaRepository<Certificacion, Long> {

	List<Certificacion> findByProyectoIdOrderByNumeroAsc(Long proyectoId);
}
