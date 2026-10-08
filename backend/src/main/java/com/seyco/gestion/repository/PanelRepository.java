package com.seyco.gestion.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.seyco.gestion.entity.Panel;

public interface PanelRepository extends JpaRepository<Panel, Long> {

	List<Panel> findAllByOrderByIdAsc();

	Optional<Panel> findByNombreIgnoreCase(String nombre);

	boolean existsByNombreIgnoreCase(String nombre);

	boolean existsByNombreIgnoreCaseAndIdNot(String nombre, Long id);
}
