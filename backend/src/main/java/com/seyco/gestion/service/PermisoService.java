package com.seyco.gestion.service;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.stream.Stream;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.seyco.gestion.dto.AuthDtos.PermisoModulo;
import com.seyco.gestion.dto.AuthDtos.Permisos;
import com.seyco.gestion.entity.RolModulo;
import com.seyco.gestion.repository.RolModuloRepository;
import com.seyco.gestion.repository.RolPanelRepository;
import com.seyco.gestion.repository.RolUsuarioRepository;

/*
 * PERMISOS SEGÚN LA BASE DE DATOS
 * Los paneles (pantallas) de cada rol salen de roles_paneles y los permisos sobre cada
 * módulo (leer / escribir / editar) de roles_modulos. Un usuario con varios roles tiene
 * la unión de los permisos.
 *
 * Acción según el método HTTP:
 *   GET -> leer   POST -> escribir (alta)   PUT / PATCH / DELETE -> editar (modificación y baja)
 */
@Service
public class PermisoService {

	public static final String LEER = "leer";
	public static final String ESCRIBIR = "escribir";
	public static final String EDITAR = "editar";

	private final RolModuloRepository rolModuloRepository;
	private final RolPanelRepository rolPanelRepository;
	private final RolUsuarioRepository rolUsuarioRepository;

	public PermisoService(RolModuloRepository rolModuloRepository, RolPanelRepository rolPanelRepository,
			RolUsuarioRepository rolUsuarioRepository) {
		this.rolModuloRepository = rolModuloRepository;
		this.rolPanelRepository = rolPanelRepository;
		this.rolUsuarioRepository = rolUsuarioRepository;
	}

	@Transactional(readOnly = true)
	public Permisos obtenerPermisos(Long idUsuario) {
		List<String> paneles = rolPanelRepository.findNombresDelUsuario(idUsuario).stream()
				.map(PermisoService::normalizar)
				.distinct()
				.sorted()
				.toList();

		Map<String, PermisoModulo> modulos = new TreeMap<>();
		for (RolModulo rm : rolModuloRepository.findDelUsuario(idUsuario)) {
			modulos.merge(normalizar(rm.getModulo().getNombre()),
					new PermisoModulo(rm.isLeer(), rm.isEscribir(), rm.isEditar()), PermisoModulo::unir);
		}

		return new Permisos(paneles, modulos);
	}

	public boolean tienePermiso(Long idUsuario, String modulo, String accion) {
		PermisoModulo permiso = obtenerPermisos(idUsuario).modulos().get(normalizar(modulo));
		if (permiso == null) {
			return false;
		}
		return switch (accion) {
			case LEER -> permiso.leer();
			case ESCRIBIR -> permiso.escribir();
			case EDITAR -> permiso.editar();
			default -> false;
		};
	}

	@Transactional(readOnly = true)
	public List<String> rolesDelUsuario(Long idUsuario) {
		return rolUsuarioRepository.findByUsuarioIdOrderByRolNombreAsc(idUsuario).stream()
				.map(ru -> normalizar(ru.getRol().getNombre()))
				.toList();
	}

	// Authorities "<modulo>:<accion>" que chequean los @PreAuthorize (ej. "proyectos:escribir").
	public List<GrantedAuthority> authorities(Permisos permisos) {
		return permisos.modulos().entrySet().stream()
				.flatMap(entrada -> {
					String modulo = entrada.getKey();
					PermisoModulo p = entrada.getValue();
					return Stream.of(
							p.leer() ? modulo + ":" + LEER : null,
							p.escribir() ? modulo + ":" + ESCRIBIR : null,
							p.editar() ? modulo + ":" + EDITAR : null);
				})
				.filter(Objects::nonNull)
				.<GrantedAuthority>map(SimpleGrantedAuthority::new)
				.toList();
	}

	static String normalizar(String nombre) {
		return nombre == null ? "" : nombre.trim().toLowerCase(Locale.ROOT);
	}
}
