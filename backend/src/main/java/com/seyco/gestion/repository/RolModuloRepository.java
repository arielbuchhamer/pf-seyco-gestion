package com.seyco.gestion.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.seyco.gestion.entity.RolModulo;

public interface RolModuloRepository extends JpaRepository<RolModulo, Long> {

	List<RolModulo> findByRolIdOrderByModuloIdAsc(Long idRol);

	Optional<RolModulo> findByRolIdAndModuloId(Long idRol, Long idModulo);

	boolean existsByRolIdAndModuloId(Long idRol, Long idModulo);

	long countByRolId(Long idRol);

	// Permisos sobre módulos de todos los roles del usuario (se unen en PermisoService).
	@Query("""
			select rm from RolModulo rm join fetch rm.modulo
			where rm.rol.id in (select ru.rol.id from RolUsuario ru where ru.usuario.id = :idUsuario)
			""")
	List<RolModulo> findDelUsuario(@Param("idUsuario") Long idUsuario);
}
