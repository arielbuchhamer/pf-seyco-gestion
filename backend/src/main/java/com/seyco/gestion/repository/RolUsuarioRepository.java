package com.seyco.gestion.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.seyco.gestion.entity.RolUsuario;

public interface RolUsuarioRepository extends JpaRepository<RolUsuario, Long> {

	List<RolUsuario> findByUsuarioIdOrderByRolNombreAsc(Long idUsuario);

	Optional<RolUsuario> findByRolIdAndUsuarioId(Long idRol, Long idUsuario);

	boolean existsByRolIdAndUsuarioId(Long idRol, Long idUsuario);

	boolean existsByUsuarioId(Long idUsuario);

	@Query("select ru from RolUsuario ru join fetch ru.rol r order by r.nombre")
	List<RolUsuario> findAllConRol();

	// Duración de la sesión: la mayor entre los roles del usuario (null si no tiene roles).
	@Query("select max(ru.rol.tokenDuracion) from RolUsuario ru where ru.usuario.id = :idUsuario")
	Integer findMaxTokenDuracion(@Param("idUsuario") Long idUsuario);
}
