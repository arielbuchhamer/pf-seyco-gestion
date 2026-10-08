package com.seyco.gestion.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.seyco.gestion.entity.Modulo;

public interface ModuloRepository extends JpaRepository<Modulo, Long> {

	List<Modulo> findAllByOrderByIdAsc();

	Optional<Modulo> findByNombreIgnoreCase(String nombre);

	boolean existsByNombreIgnoreCase(String nombre);

	boolean existsByNombreIgnoreCaseAndIdNot(String nombre, Long id);
}
