package com.seyco.gestion.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.seyco.gestion.entity.RolPanel;

public interface RolPanelRepository extends JpaRepository<RolPanel, Long> {

	List<RolPanel> findByRolIdOrderByPanelIdAsc(Long idRol);

	Optional<RolPanel> findByRolIdAndPanelId(Long idRol, Long idPanel);

	boolean existsByRolIdAndPanelId(Long idRol, Long idPanel);

	long countByRolId(Long idRol);

	// Paneles de todos los roles del usuario, sin repetir.
	@Query("""
			select distinct rp.panel.nombre from RolPanel rp
			where rp.rol.id in (select ru.rol.id from RolUsuario ru where ru.usuario.id = :idUsuario)
			""")
	List<String> findNombresDelUsuario(@Param("idUsuario") Long idUsuario);
}
