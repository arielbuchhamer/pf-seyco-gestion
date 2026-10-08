package com.seyco.gestion.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.seyco.gestion.entity.Rol;

public interface RolRepository extends JpaRepository<Rol, Long> {

	List<Rol> findAllByOrderByIdAsc();

	Optional<Rol> findByNombreIgnoreCase(String nombre);

	boolean existsByNombreIgnoreCase(String nombre);

	boolean existsByNombreIgnoreCaseAndIdNot(String nombre, Long id);
}
