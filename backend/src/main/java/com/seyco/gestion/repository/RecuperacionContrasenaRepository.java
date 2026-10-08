package com.seyco.gestion.repository;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.seyco.gestion.entity.RecuperacionContrasena;

public interface RecuperacionContrasenaRepository extends JpaRepository<RecuperacionContrasena, Long> {

	boolean existsByUsuarioIdAndFechaUsoIsNullAndFechaAltaAfter(Long idUsuario, Instant desde);

	@Query("""
			select r from RecuperacionContrasena r join fetch r.usuario u
			where r.tokenHash = :hash and r.fechaUso is null and r.fechaExpiracion > :ahora and u.fechaBaja is null
			""")
	Optional<RecuperacionContrasena> buscarVigente(@Param("hash") String hash, @Param("ahora") Instant ahora);

	// Un link nuevo (o una contraseña ya cambiada) invalida los anteriores.
	@Modifying
	@Query("update RecuperacionContrasena r set r.fechaUso = :ahora where r.usuario.id = :idUsuario and r.fechaUso is null")
	int invalidarPendientes(@Param("idUsuario") Long idUsuario, @Param("ahora") Instant ahora);
}
