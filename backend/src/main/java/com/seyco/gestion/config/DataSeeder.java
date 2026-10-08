package com.seyco.gestion.config;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;

import com.seyco.gestion.entity.Modulo;
import com.seyco.gestion.entity.Panel;
import com.seyco.gestion.entity.Rol;
import com.seyco.gestion.entity.RolModulo;
import com.seyco.gestion.entity.RolPanel;
import com.seyco.gestion.entity.RolUsuario;
import com.seyco.gestion.entity.Usuario;
import com.seyco.gestion.repository.ModuloRepository;
import com.seyco.gestion.repository.PanelRepository;
import com.seyco.gestion.repository.RolModuloRepository;
import com.seyco.gestion.repository.RolPanelRepository;
import com.seyco.gestion.repository.RolRepository;
import com.seyco.gestion.repository.RolUsuarioRepository;
import com.seyco.gestion.repository.UsuarioRepository;
import com.seyco.gestion.service.RolService;

/**
 * Datos iniciales de la gestión de accesos (idempotente: sólo crea lo que falta).
 *
 * Módulos:  proyectos, tareas, usuarios, roles
 * Paneles:  paneles-proyectos, paneles-tareas, paneles-usuarios, paneles-roles
 * Roles:
 *   admin -> todos los módulos (leer/escribir/editar) y todos los paneles
 *   visor -> sólo proyectos (leer) y el panel de proyectos
 *
 * Usuarios de prueba (solo desarrollo):
 *   admin@seyco.com / admin123  (rol admin)
 *   visor@seyco.com / visor123  (rol visor)
 *
 * Los permisos de un rol se siembran sólo si el rol todavía no tiene ninguno: lo que se
 * cambie después desde la pantalla Roles no se pisa al reiniciar el backend.
 */
@Configuration
public class DataSeeder {

	private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

	private static final String ROL_VISOR = "visor";
	// Misma duración que tenía la sesión JWT anterior (8 h). Se cambia desde la pantalla Roles.
	private static final int TOKEN_DURACION_MINUTOS = 480;

	private static final List<String> MODULOS = List.of("proyectos", "tareas", "usuarios", "roles");
	private static final List<String> PANELES = List.of("paneles-proyectos", "paneles-tareas", "paneles-usuarios",
			"paneles-roles");

	@Bean
	CommandLineRunner seedGestionDeAccesos(TransactionTemplate transaction, ModuloRepository moduloRepository,
			PanelRepository panelRepository, RolRepository rolRepository, RolModuloRepository rolModuloRepository,
			RolPanelRepository rolPanelRepository, RolUsuarioRepository rolUsuarioRepository,
			UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
		return args -> transaction.executeWithoutResult(status -> {
			Map<String, Modulo> modulos = new HashMap<>();
			for (String nombre : MODULOS) {
				modulos.put(nombre, moduloRepository.findByNombreIgnoreCase(nombre).orElseGet(() -> {
					Modulo modulo = new Modulo();
					modulo.setNombre(nombre);
					return moduloRepository.save(modulo);
				}));
			}

			Map<String, Panel> paneles = new HashMap<>();
			for (String nombre : PANELES) {
				paneles.put(nombre, panelRepository.findByNombreIgnoreCase(nombre).orElseGet(() -> {
					Panel panel = new Panel();
					panel.setNombre(nombre);
					return panelRepository.save(panel);
				}));
			}

			Rol admin = buscarOCrearRol(rolRepository, RolService.ROL_ADMIN);
			if (sinPermisos(admin, rolModuloRepository, rolPanelRepository)) {
				MODULOS.forEach(m -> asignarModulo(rolModuloRepository, admin, modulos.get(m), true, true, true));
				PANELES.forEach(p -> asignarPanel(rolPanelRepository, admin, paneles.get(p)));
			}

			Rol visor = buscarOCrearRol(rolRepository, ROL_VISOR);
			if (sinPermisos(visor, rolModuloRepository, rolPanelRepository)) {
				asignarModulo(rolModuloRepository, visor, modulos.get("proyectos"), true, false, false);
				asignarPanel(rolPanelRepository, visor, paneles.get("paneles-proyectos"));
			}

			crearUsuario(usuarioRepository, rolUsuarioRepository, passwordEncoder, "admin@seyco.com", "admin123",
					"Admin", "Seyco", admin);
			crearUsuario(usuarioRepository, rolUsuarioRepository, passwordEncoder, "visor@seyco.com", "visor123",
					"Visor", "Seyco", visor);
		});
	}

	private static Rol buscarOCrearRol(RolRepository rolRepository, String nombre) {
		return rolRepository.findByNombreIgnoreCase(nombre).orElseGet(() -> {
			Rol rol = new Rol();
			rol.setNombre(nombre);
			rol.setTokenDuracion(TOKEN_DURACION_MINUTOS);
			return rolRepository.save(rol);
		});
	}

	private static boolean sinPermisos(Rol rol, RolModuloRepository rolModuloRepository,
			RolPanelRepository rolPanelRepository) {
		return rolModuloRepository.countByRolId(rol.getId()) == 0 && rolPanelRepository.countByRolId(rol.getId()) == 0;
	}

	private static void asignarModulo(RolModuloRepository repository, Rol rol, Modulo modulo, boolean leer,
			boolean escribir, boolean editar) {
		RolModulo rolModulo = new RolModulo();
		rolModulo.setRol(rol);
		rolModulo.setModulo(modulo);
		rolModulo.setLeer(leer);
		rolModulo.setEscribir(escribir);
		rolModulo.setEditar(editar);
		repository.save(rolModulo);
	}

	private static void asignarPanel(RolPanelRepository repository, Rol rol, Panel panel) {
		RolPanel rolPanel = new RolPanel();
		rolPanel.setRol(rol);
		rolPanel.setPanel(panel);
		repository.save(rolPanel);
	}

	private static void crearUsuario(UsuarioRepository usuarioRepository, RolUsuarioRepository rolUsuarioRepository,
			PasswordEncoder passwordEncoder, String email, String contrasena, String nombre, String apellido, Rol rol) {
		if (usuarioRepository.findByEmailIgnoreCaseAndFechaBajaIsNull(email).isPresent()) {
			return;
		}
		Usuario usuario = new Usuario();
		usuario.setEmail(email);
		usuario.setNombre(nombre);
		usuario.setApellido(apellido);
		usuario.setContrasena(passwordEncoder.encode(contrasena));
		usuario.setFechaAlta(Instant.now());
		usuarioRepository.save(usuario);
		rolUsuarioRepository.save(new RolUsuario(rol, usuario));
		log.info("Usuario de prueba sembrado: {} / {} (rol {})", email, contrasena, rol.getNombre());
	}
}
