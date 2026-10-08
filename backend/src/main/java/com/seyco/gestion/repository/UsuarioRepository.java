package com.seyco.gestion.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.seyco.gestion.entity.Usuario;

// "Activo" = sin fecha_baja (la baja de usuarios es lógica).
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

	Optional<Usuario> findByEmailIgnoreCaseAndFechaBajaIsNull(String email);

	Optional<Usuario> findByIdAndFechaBajaIsNull(Long id);

	List<Usuario> findByFechaBajaIsNullOrderByApellidoAscNombreAsc();

	boolean existsByEmailIgnoreCaseAndFechaBajaIsNull(String email);

	boolean existsByEmailIgnoreCaseAndFechaBajaIsNullAndIdNot(String email, Long id);
}
