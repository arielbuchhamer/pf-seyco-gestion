package com.seyco.gestion.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.seyco.gestion.dto.AuthDtos.LoginRequest;
import com.seyco.gestion.dto.AuthDtos.RespuestaAuth;
import com.seyco.gestion.dto.AuthDtos.UsuarioSesion;
import com.seyco.gestion.entity.Rol;
import com.seyco.gestion.entity.Sesion;
import com.seyco.gestion.entity.Usuario;
import com.seyco.gestion.repository.RolUsuarioRepository;
import com.seyco.gestion.repository.SesionRepository;
import com.seyco.gestion.repository.UsuarioRepository;
import com.seyco.gestion.security.Tokens;
import com.seyco.gestion.security.UsuarioAutenticado;

// Sesiones con token opaco guardado en la tabla `sesiones` (no JWT): el logout y la baja
// del usuario invalidan el token al instante, y el administrador ve cuántas sesiones tuvo
// cada usuario. La duración sale de roles.token_duracion (minutos).
@Service
public class AuthService {

	private final UsuarioRepository usuarioRepository;
	private final SesionRepository sesionRepository;
	private final RolUsuarioRepository rolUsuarioRepository;
	private final PermisoService permisoService;
	private final PasswordEncoder passwordEncoder;

	public AuthService(UsuarioRepository usuarioRepository, SesionRepository sesionRepository,
			RolUsuarioRepository rolUsuarioRepository, PermisoService permisoService, PasswordEncoder passwordEncoder) {
		this.usuarioRepository = usuarioRepository;
		this.sesionRepository = sesionRepository;
		this.rolUsuarioRepository = rolUsuarioRepository;
		this.permisoService = permisoService;
		this.passwordEncoder = passwordEncoder;
	}

	@Transactional
	public RespuestaAuth login(LoginRequest credenciales) {
		String email = credenciales.email() == null ? "" : credenciales.email().trim();
		String contrasena = credenciales.contrasena() == null ? "" : credenciales.contrasena();

		Usuario usuario = usuarioRepository.findByEmailIgnoreCaseAndFechaBajaIsNull(email)
				.orElseThrow(ServiceException::credencialesInvalidas);

		if (!passwordEncoder.matches(contrasena, usuario.getContrasena())) {
			throw ServiceException.credencialesInvalidas();
		}

		Instant ahora = Instant.now();
		Sesion sesion = new Sesion();
		sesion.setToken(Tokens.generar());
		sesion.setFechaLogin(ahora);
		sesion.setFechaExpiracion(ahora.plus(duracionTokenMinutos(usuario.getId()), ChronoUnit.MINUTES));
		sesion.setActivo(true);
		sesion.setUsuario(usuario);
		sesionRepository.save(sesion);

		return new RespuestaAuth("Login exitoso", sesion.getToken(), usuarioSesion(usuario),
				permisoService.obtenerPermisos(usuario.getId()));
	}

	// Usado por SesionAuthenticationFilter en cada pedido.
	@Transactional(readOnly = true)
	public Optional<UsuarioAutenticado> autenticar(String token) {
		return sesionRepository.buscarActiva(token, Instant.now())
				.map(sesion -> new UsuarioAutenticado(sesion.getUsuario().getId(), sesion.getUsuario().getEmail(),
						sesion.getToken()));
	}

	@Transactional
	public void logout(String token) {
		sesionRepository.findByTokenAndActivoTrue(token).ifPresent(sesion -> {
			sesion.setActivo(false);
			sesion.setFechaLogout(Instant.now());
		});
	}

	// GET /api/auth/me: usuario y permisos frescos (refleja cambios hechos en Roles sin
	// volver a iniciar sesión).
	@Transactional(readOnly = true)
	public RespuestaAuth perfil(Long idUsuario) {
		Usuario usuario = usuarioRepository.findByIdAndFechaBajaIsNull(idUsuario)
				.orElseThrow(ServiceException::credencialesInvalidas);
		return new RespuestaAuth(null, null, usuarioSesion(usuario), permisoService.obtenerPermisos(idUsuario));
	}

	private UsuarioSesion usuarioSesion(Usuario usuario) {
		return new UsuarioSesion(usuario.getId(), usuario.getEmail(), usuario.getNombre(), usuario.getApellido(),
				permisoService.rolesDelUsuario(usuario.getId()));
	}

	// Con varios roles se toma la mayor duración; sin roles, la duración por defecto.
	private int duracionTokenMinutos(Long idUsuario) {
		Integer duracion = rolUsuarioRepository.findMaxTokenDuracion(idUsuario);
		return duracion != null ? duracion : Rol.TOKEN_DURACION_POR_DEFECTO;
	}
}
