package com.seyco.gestion.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.seyco.gestion.dto.AccesoDtos.RolResumen;
import com.seyco.gestion.dto.AccesoDtos.UsuarioListado;
import com.seyco.gestion.dto.PerfilDtos.ActualizarPerfilRequest;
import com.seyco.gestion.entity.Usuario;
import com.seyco.gestion.repository.RolUsuarioRepository;
import com.seyco.gestion.repository.SesionRepository;
import com.seyco.gestion.repository.TareaRepository;
import com.seyco.gestion.repository.UsuarioRepository;

// Los roles del usuario no se cambian acá sino con /api/roles/{id}/usuarios (módulo `roles`):
// así quien sólo administra usuarios no puede darse a sí mismo (ni a nadie) el rol admin.
@Service
public class UsuarioService {

	// Regla simplificada respecto al relevamiento original (mayúscula + carácter especial quedaron afuera):
	// 8+ caracteres y 1 número. Máximo 72: BCrypt ignora lo que pase de 72 bytes.
	private static final Pattern PASSWORD_PATTERN = Pattern.compile("^(?=.*\\d).{8,72}$");
	private static final int LARGO_MAXIMO = 50;
	// Sólo para Mi perfil (la pantalla de Usuarios mantiene las reglas de validarDatos).
	private static final Pattern SOLO_NUMEROS = Pattern.compile("\\d+");
	private static final Pattern DNI_PERFIL_PATTERN = Pattern.compile("[1-9]\\d{6,7}");

	private final UsuarioRepository usuarioRepository;
	private final RolUsuarioRepository rolUsuarioRepository;
	private final SesionRepository sesionRepository;
	private final TareaRepository tareaRepository;
	private final PasswordEncoder passwordEncoder;

	public UsuarioService(UsuarioRepository usuarioRepository, RolUsuarioRepository rolUsuarioRepository,
			SesionRepository sesionRepository, TareaRepository tareaRepository, PasswordEncoder passwordEncoder) {
		this.usuarioRepository = usuarioRepository;
		this.rolUsuarioRepository = rolUsuarioRepository;
		this.sesionRepository = sesionRepository;
		this.tareaRepository = tareaRepository;
		this.passwordEncoder = passwordEncoder;
	}

	// También la usa RecuperacionService al restablecer la contraseña.
	public static void validarContrasena(String contrasena) {
		if (contrasena == null || !PASSWORD_PATTERN.matcher(contrasena).matches()) {
			throw ServiceException.datosInvalidos(
					"La contraseña debe tener entre 8 y 72 caracteres y al menos un número.");
		}
	}

	@Transactional(readOnly = true)
	public List<UsuarioListado> listar() {
		Map<Long, List<RolResumen>> rolesPorUsuario = rolUsuarioRepository.findAllConRol().stream()
				.collect(Collectors.groupingBy(ru -> ru.getUsuario().getId(),
						Collectors.mapping(ru -> new RolResumen(ru.getRol().getId(), ru.getRol().getNombre()),
								Collectors.toList())));

		Map<Long, Long> sesionesPorUsuario = sesionRepository.contarPorUsuario().stream()
				.collect(Collectors.toMap(fila -> (Long) fila[0], fila -> (Long) fila[1]));

		return usuarioRepository.findByFechaBajaIsNullOrderByApellidoAscNombreAsc().stream()
				.map(u -> new UsuarioListado(u.getId(), u.getEmail(), u.getNombre(), u.getApellido(), u.getDni(),
						u.getTelefono(), u.getFechaAlta(), u.getFechaActualizacion(), u.getFechaBaja(),
						rolesPorUsuario.getOrDefault(u.getId(), List.of()),
						sesionesPorUsuario.getOrDefault(u.getId(), 0L)))
				.toList();
	}

	@Transactional
	public Usuario crear(Usuario nuevo) {
		validarDatos(nuevo);
		validarContrasena(nuevo.getContrasena());
		if (usuarioRepository.existsByEmailIgnoreCaseAndFechaBajaIsNull(nuevo.getEmail())) {
			throw ServiceException.conflicto("Ya existe un usuario registrado con ese email.");
		}

		nuevo.setId(null);
		nuevo.setContrasena(passwordEncoder.encode(nuevo.getContrasena()));
		nuevo.setFechaAlta(Instant.now());
		nuevo.setFechaActualizacion(null);
		nuevo.setFechaBaja(null);
		return usuarioRepository.save(nuevo);
	}

	// Sin @Valid en el controller: acá la contraseña es opcional (vacía = no cambiarla),
	// por eso las validaciones se hacen a mano en vez de con anotaciones de la entidad.
	@Transactional
	public Usuario actualizar(Long id, Usuario cambios) {
		Usuario existente = buscarActivo(id);
		validarDatos(cambios);

		if (usuarioRepository.existsByEmailIgnoreCaseAndFechaBajaIsNullAndIdNot(cambios.getEmail(), id)) {
			throw ServiceException.conflicto("Ya existe un usuario registrado con ese email.");
		}

		existente.setEmail(cambios.getEmail());
		existente.setNombre(cambios.getNombre());
		existente.setApellido(cambios.getApellido());
		existente.setDni(cambios.getDni());
		existente.setTelefono(cambios.getTelefono());

		String nuevaContrasena = cambios.getContrasena();
		if (nuevaContrasena != null && !nuevaContrasena.isBlank()) {
			validarContrasena(nuevaContrasena);
			existente.setContrasena(passwordEncoder.encode(nuevaContrasena));
		}

		existente.setFechaActualizacion(Instant.now());
		return usuarioRepository.save(existente);
	}

	// Baja lógica (fecha_baja): el usuario no puede volver a iniciar sesión ni aparece en los
	// listados, pero sigue figurando en el historial de tareas (quién hizo cada cambio).
	@Transactional
	public void eliminar(Long id, String emailSolicitante) {
		Usuario existente = buscarActivo(id);

		if (existente.getEmail().equalsIgnoreCase(emailSolicitante)) {
			throw ServiceException.datosInvalidos("No podés eliminar tu propio usuario.");
		}

		// Se bloquea en vez de desasignar solo, para que nadie pierda de vista tareas que
		// quedarían a cargo de alguien que ya no está.
		long tareasAsignadas = tareaRepository.countByResponsableId(id);
		if (tareasAsignadas > 0) {
			throw ServiceException.conflicto("El usuario tiene " + tareasAsignadas
					+ (tareasAsignadas == 1 ? " tarea asignada" : " tareas asignadas") + ". Reasignalas antes de eliminarlo.");
		}

		Instant ahora = Instant.now();
		existente.setFechaBaja(ahora);
		sesionRepository.cerrarTodas(id, ahora);
	}

	@Transactional(readOnly = true)
	public Usuario obtenerActivo(Long id) {
		return buscarActivo(id);
	}

	// Mi perfil: el email no se cambia (identifica la sesión), así que se valida con el actual.
	// Se valida sobre una copia para no tocar al usuario si algún dato es inválido.
	// Además de validarDatos, el perfil exige DNI de 7 u 8 dígitos y teléfono sólo con números
	// (hasta 50).
	@Transactional
	public Usuario actualizarPerfil(Long id, ActualizarPerfilRequest pedido) {
		Usuario existente = buscarActivo(id);

		Usuario cambios = new Usuario();
		cambios.setEmail(existente.getEmail());
		cambios.setNombre(pedido.nombre());
		cambios.setApellido(pedido.apellido());
		cambios.setTelefono(pedido.telefono());
		validarDatos(cambios);
		cambios.setDni(convertirDniPerfil(pedido.dni()));
		validarTelefonoPerfil(cambios.getTelefono());

		existente.setNombre(cambios.getNombre());
		existente.setApellido(cambios.getApellido());
		existente.setDni(cambios.getDni());
		existente.setTelefono(cambios.getTelefono());
		existente.setFechaActualizacion(Instant.now());
		return usuarioRepository.save(existente);
	}

	// Vacío = sin DNI. Si trae algo que no es número, ese mensaje gana aunque también falten
	// o sobren dígitos.
	private static Integer convertirDniPerfil(String dni) {
		if (dni == null || dni.isBlank()) {
			return null;
		}
		String valor = dni.trim();
		if (!SOLO_NUMEROS.matcher(valor).matches()) {
			throw ServiceException.datosInvalidos("Sólo se aceptan números.");
		}
		if (!DNI_PERFIL_PATTERN.matcher(valor).matches()) {
			throw ServiceException.datosInvalidos("DNI inválido.");
		}
		return Integer.valueOf(valor);
	}

	// Recibe el teléfono ya normalizado por validarDatos (sin espacios en los extremos, vacío = null).
	// Si trae algo que no es número, ese mensaje gana aunque también sobren caracteres.
	private static void validarTelefonoPerfil(String telefono) {
		if (telefono == null) {
			return;
		}
		if (!SOLO_NUMEROS.matcher(telefono).matches()) {
			throw ServiceException.datosInvalidos("Sólo se aceptan números.");
		}
		if (telefono.length() > LARGO_MAXIMO) {
			throw ServiceException.datosInvalidos("El teléfono puede tener hasta 50 caracteres.");
		}
	}

	private Usuario buscarActivo(Long id) {
		return usuarioRepository.findByIdAndFechaBajaIsNull(id)
				.orElseThrow(() -> ServiceException.noEncontrado("El usuario no existe."));
	}

	// Además de validar, normaliza espacios: se usan para las iniciales del avatar en el front.
	private void validarDatos(Usuario usuario) {
		if (usuario.getEmail() == null || usuario.getEmail().isBlank()) {
			throw ServiceException.datosInvalidos("El email es obligatorio.");
		}
		if (usuario.getNombre() == null || usuario.getNombre().isBlank()) {
			throw ServiceException.datosInvalidos("El nombre es obligatorio.");
		}
		if (usuario.getApellido() == null || usuario.getApellido().isBlank()) {
			throw ServiceException.datosInvalidos("El apellido es obligatorio.");
		}
		usuario.setEmail(usuario.getEmail().trim());
		usuario.setNombre(usuario.getNombre().trim());
		usuario.setApellido(usuario.getApellido().trim());

		if (usuario.getEmail().length() > LARGO_MAXIMO || usuario.getNombre().length() > LARGO_MAXIMO
				|| usuario.getApellido().length() > LARGO_MAXIMO) {
			throw ServiceException.datosInvalidos("El email, el nombre y el apellido pueden tener hasta 50 caracteres.");
		}
		if (usuario.getDni() != null && usuario.getDni() <= 0) {
			throw ServiceException.datosInvalidos("El DNI debe ser un número positivo.");
		}
		if (usuario.getTelefono() != null) {
			String telefono = usuario.getTelefono().trim();
			usuario.setTelefono(telefono.isEmpty() ? null : telefono);
		}
	}
}
