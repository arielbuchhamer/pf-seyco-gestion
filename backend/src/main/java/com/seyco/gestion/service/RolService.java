package com.seyco.gestion.service;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.seyco.gestion.dto.AccesoDtos.PermisoModuloRequest;
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

// Roles y sus asociaciones con módulos (permisos), paneles (pantallas) y usuarios.
@Service
public class RolService extends BaseService<Rol, Long> {

	// Lo siembra DataSeeder. No se puede borrar ni renombrar: si no, al reiniciar el
	// backend se crearía de nuevo y nadie quedaría pudiendo administrar los accesos.
	public static final String ROL_ADMIN = "admin";

	private final RolRepository rolRepository;
	private final ModuloRepository moduloRepository;
	private final PanelRepository panelRepository;
	private final RolModuloRepository rolModuloRepository;
	private final RolPanelRepository rolPanelRepository;
	private final RolUsuarioRepository rolUsuarioRepository;
	private final UsuarioRepository usuarioRepository;

	public RolService(RolRepository rolRepository, ModuloRepository moduloRepository, PanelRepository panelRepository,
			RolModuloRepository rolModuloRepository, RolPanelRepository rolPanelRepository,
			RolUsuarioRepository rolUsuarioRepository, UsuarioRepository usuarioRepository) {
		super("El rol no existe.");
		this.rolRepository = rolRepository;
		this.moduloRepository = moduloRepository;
		this.panelRepository = panelRepository;
		this.rolModuloRepository = rolModuloRepository;
		this.rolPanelRepository = rolPanelRepository;
		this.rolUsuarioRepository = rolUsuarioRepository;
		this.usuarioRepository = usuarioRepository;
	}

	@Override
	protected JpaRepository<Rol, Long> getRepository() {
		return rolRepository;
	}

	// --- ROL ---

	@Override
	public List<Rol> listar() {
		return rolRepository.findAllByOrderByIdAsc();
	}

	@Override
	@Transactional
	public Rol crear(Rol nuevo) {
		validar(nuevo);
		if (rolRepository.existsByNombreIgnoreCase(nuevo.getNombre())) {
			throw ServiceException.conflicto("Ya existe un rol con ese nombre.");
		}
		nuevo.setId(null);
		return rolRepository.save(nuevo);
	}

	@Transactional
	public Rol actualizar(Long id, Rol cambios) {
		Rol existente = buscarPorId(id);
		validar(cambios);

		if (esAdmin(existente) && !esAdmin(cambios)) {
			throw ServiceException.prohibido("El rol admin no se puede renombrar.");
		}
		if (rolRepository.existsByNombreIgnoreCaseAndIdNot(cambios.getNombre(), id)) {
			throw ServiceException.conflicto("Ya existe un rol con ese nombre.");
		}

		existente.setNombre(cambios.getNombre());
		existente.setTokenDuracion(cambios.getTokenDuracion());
		return rolRepository.save(existente);
	}

	// Sus filas en roles_modulos, roles_paneles y roles_usuarios se borran solas (ON DELETE CASCADE).
	@Override
	@Transactional
	public void eliminar(Long id) {
		Rol rol = buscarPorId(id);
		if (esAdmin(rol)) {
			throw ServiceException.prohibido("El rol admin no se puede eliminar.");
		}
		rolRepository.delete(rol);
	}

	// --- ROLES_MODULOS ---

	public List<RolModulo> modulos(Long idRol) {
		buscarPorId(idRol);
		return rolModuloRepository.findByRolIdOrderByModuloIdAsc(idRol);
	}

	@Transactional
	public RolModulo asignarModulo(Long idRol, PermisoModuloRequest permisos) {
		Rol rol = buscarPorId(idRol);
		if (permisos.idModulo() == null) {
			throw ServiceException.datosInvalidos("El módulo es obligatorio.");
		}
		Modulo modulo = moduloRepository.findById(permisos.idModulo())
				.orElseThrow(() -> ServiceException.noEncontrado("El módulo no existe."));
		if (rolModuloRepository.existsByRolIdAndModuloId(idRol, modulo.getId())) {
			throw ServiceException.conflicto("El módulo ya está asignado al rol.");
		}

		RolModulo rolModulo = new RolModulo();
		rolModulo.setRol(rol);
		rolModulo.setModulo(modulo);
		aplicarPermisos(rolModulo, permisos);
		return rolModuloRepository.save(rolModulo);
	}

	// Los permisos de un módulo se cambian (y se quitan, todo en false) con PUT.
	@Transactional
	public RolModulo actualizarModulo(Long idRol, Long idModulo, PermisoModuloRequest permisos) {
		RolModulo rolModulo = rolModuloRepository.findByRolIdAndModuloId(idRol, idModulo)
				.orElseThrow(() -> ServiceException.noEncontrado("El módulo no está asignado al rol."));
		aplicarPermisos(rolModulo, permisos);
		return rolModuloRepository.save(rolModulo);
	}

	// --- ROLES_PANELES ---

	public List<RolPanel> paneles(Long idRol) {
		buscarPorId(idRol);
		return rolPanelRepository.findByRolIdOrderByPanelIdAsc(idRol);
	}

	@Transactional
	public RolPanel asignarPanel(Long idRol, Long idPanel) {
		Rol rol = buscarPorId(idRol);
		if (idPanel == null) {
			throw ServiceException.datosInvalidos("El panel es obligatorio.");
		}
		Panel panel = panelRepository.findById(idPanel)
				.orElseThrow(() -> ServiceException.noEncontrado("El panel no existe."));
		if (rolPanelRepository.existsByRolIdAndPanelId(idRol, idPanel)) {
			throw ServiceException.conflicto("El panel ya está asignado al rol.");
		}

		RolPanel rolPanel = new RolPanel();
		rolPanel.setRol(rol);
		rolPanel.setPanel(panel);
		return rolPanelRepository.save(rolPanel);
	}

	@Transactional
	public void desasignarPanel(Long idRol, Long idPanel) {
		RolPanel rolPanel = rolPanelRepository.findByRolIdAndPanelId(idRol, idPanel)
				.orElseThrow(() -> ServiceException.noEncontrado("El panel no está asignado al rol."));
		rolPanelRepository.delete(rolPanel);
	}

	// --- ROLES_USUARIOS ---

	@Transactional
	public RolUsuario asignarUsuario(Long idRol, Long idUsuario) {
		Rol rol = buscarPorId(idRol);
		if (idUsuario == null) {
			throw ServiceException.datosInvalidos("El usuario es obligatorio.");
		}
		Usuario usuario = usuarioRepository.findByIdAndFechaBajaIsNull(idUsuario)
				.orElseThrow(() -> ServiceException.noEncontrado("El usuario no existe."));
		if (rolUsuarioRepository.existsByRolIdAndUsuarioId(idRol, idUsuario)) {
			throw ServiceException.conflicto("El usuario ya tiene ese rol.");
		}
		return rolUsuarioRepository.save(new RolUsuario(rol, usuario));
	}

	@Transactional
	public void desasignarUsuario(Long idRol, Long idUsuario) {
		RolUsuario rolUsuario = rolUsuarioRepository.findByRolIdAndUsuarioId(idRol, idUsuario)
				.orElseThrow(() -> ServiceException.noEncontrado("El usuario no tiene ese rol."));
		rolUsuarioRepository.delete(rolUsuario);
	}

	private void validar(Rol rol) {
		if (rol.getNombre() == null || rol.getNombre().isBlank()) {
			throw ServiceException.datosInvalidos("El nombre del rol es obligatorio.");
		}
		rol.setNombre(rol.getNombre().trim());
		if (rol.getNombre().length() > 50) {
			throw ServiceException.datosInvalidos("El nombre del rol puede tener hasta 50 caracteres.");
		}
		if (rol.getTokenDuracion() == null) {
			rol.setTokenDuracion(Rol.TOKEN_DURACION_POR_DEFECTO);
		}
		if (rol.getTokenDuracion() <= 0) {
			throw ServiceException.datosInvalidos("La duración del token debe ser de al menos 1 minuto.");
		}
	}

	private static boolean esAdmin(Rol rol) {
		return rol.getNombre() != null && ROL_ADMIN.equalsIgnoreCase(rol.getNombre().trim());
	}

	private static void aplicarPermisos(RolModulo rolModulo, PermisoModuloRequest permisos) {
		rolModulo.setLeer(permisos.leer());
		rolModulo.setEscribir(permisos.escribir());
		rolModulo.setEditar(permisos.editar());
	}
}
