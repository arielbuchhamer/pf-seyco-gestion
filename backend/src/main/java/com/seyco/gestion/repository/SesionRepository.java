package com.seyco.gestion.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.seyco.gestion.entity.Sesion;

public interface SesionRepository extends JpaRepository<Sesion, Long> {

	// Sesión válida: activa, sin vencer y de un usuario que no está dado de baja.
	@Query("""
			select s from Sesion s join fetch s.usuario u
			where s.token = :token and s.activo = true and s.fechaExpiracion > :ahora and u.fechaBaja is null
			""")
	Optional<Sesion> buscarActiva(@Param("token") String token, @Param("ahora") Instant ahora);

	Optional<Sesion> findByTokenAndActivoTrue(String token);

	@Modifying
	@Query("update Sesion s set s.activo = false, s.fechaLogout = :ahora where s.usuario.id = :idUsuario and s.activo = true")
	int cerrarTodas(@Param("idUsuario") Long idUsuario, @Param("ahora") Instant ahora);

	// Filas [idUsuario, cantidad] para la columna "Sesiones" del listado de usuarios.
	@Query("select s.usuario.id, count(s) from Sesion s group by s.usuario.id")
	List<Object[]> contarPorUsuario();
}
