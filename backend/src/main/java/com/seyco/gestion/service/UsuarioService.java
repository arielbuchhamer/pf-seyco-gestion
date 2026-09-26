package com.seyco.gestion.service;

import java.util.List;
import java.util.regex.Pattern;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.seyco.gestion.entity.Usuario;
import com.seyco.gestion.repository.HistorialEstadoTareaRepository;
import com.seyco.gestion.repository.TareaRepository;
import com.seyco.gestion.repository.UsuarioRepository;

@Service
public class UsuarioService {

	// Regla simplificada respecto al relevamiento original (mayúscula + carácter especial quedaron afuera): 8+ caracteres y 1 número.
	private static final Pattern PASSWORD_PATTERN =
			Pattern.compile("^(?=.*\\d).{8,}$");

	private final UsuarioRepository usuarioRepository;
	private final PasswordEncoder passwordEncoder;
	private final TareaRepository tareaRepository;
	private final HistorialEstadoTareaRepository historialEstadoTareaRepository;

	public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder,
			TareaRepository tareaRepository, HistorialEstadoTareaRepository historialEstadoTareaRepository) {
		this.usuarioRepository = usuarioRepository;
		this.passwordEncoder = passwordEncoder;
		this.tareaRepository = tareaRepository;
		this.historialEstadoTareaRepository = historialEstadoTareaRepository;
	}

	public List<Usuario> listar() {
		return usuarioRepository.findAll();
	}

	public Usuario crear(Usuario nuevo) {
		if (nuevo.getRol() == null) {
			throw ServiceException.datosInvalidos("El rol es obligatorio.");
		}
		validarNombreYApellido(nuevo);
		if (!PASSWORD_PATTERN.matcher(nuevo.getClave()).matches()) {
			throw ServiceException.datosInvalidos("La contraseña debe tener al menos 8 caracteres y un número.");
		}
		if (usuarioRepository.findByEmail(nuevo.getEmail()).isPresent()) {
			throw ServiceException.conflicto("Ya existe un usuario registrado con ese email.");
		}

		nuevo.setClave(passwordEncoder.encode(nuevo.getClave()));
		return usuarioRepository.save(nuevo);
	}

	// Sin @Valid en el controller: acá la contraseña es opcional (vacía = no cambiarla),
	// por eso las validaciones se hacen a mano en vez de con anotaciones de la entidad.
	public Usuario actualizar(Long id, Usuario cambios) {
		Usuario existente = usuarioRepository.findById(id)
				.orElseThrow(() -> ServiceException.noEncontrado("El usuario no existe."));

		if (cambios.getEmail() == null || cambios.getEmail().isBlank()) {
			throw ServiceException.datosInvalidos("El email es obligatorio.");
		}
		if (cambios.getRol() == null) {
			throw ServiceException.datosInvalidos("El rol es obligatorio.");
		}
		validarNombreYApellido(cambios);

		usuarioRepository.findByEmail(cambios.getEmail())
				.filter(otro -> !otro.getId().equals(id))
				.ifPresent(otro -> {
					throw ServiceException.conflicto("Ya existe un usuario registrado con ese email.");
				});

		existente.setEmail(cambios.getEmail());
		existente.setRol(cambios.getRol());
		existente.setNombre(cambios.getNombre());
		existente.setApellido(cambios.getApellido());

		String nuevaClave = cambios.getClave();
		if (nuevaClave != null && !nuevaClave.isBlank()) {
			if (!PASSWORD_PATTERN.matcher(nuevaClave).matches()) {
				throw ServiceException.datosInvalidos("La contraseña debe tener al menos 8 caracteres y un número.");
			}
			existente.setClave(passwordEncoder.encode(nuevaClave));
		}

		return usuarioRepository.save(existente);
	}

	// Además de validar, normaliza espacios: se usan para las iniciales del avatar en el front.
	private void validarNombreYApellido(Usuario usuario) {
		if (usuario.getNombre() == null || usuario.getNombre().isBlank()) {
			throw ServiceException.datosInvalidos("El nombre es obligatorio.");
		}
		if (usuario.getApellido() == null || usuario.getApellido().isBlank()) {
			throw ServiceException.datosInvalidos("El apellido es obligatorio.");
		}
		usuario.setNombre(usuario.getNombre().trim());
		usuario.setApellido(usuario.getApellido().trim());
	}

	public void eliminar(Long id, String emailSolicitante) {
		Usuario existente = usuarioRepository.findById(id)
				.orElseThrow(() -> ServiceException.noEncontrado("El usuario no existe."));

		if (existente.getEmail().equalsIgnoreCase(emailSolicitante)) {
			throw ServiceException.datosInvalidos("No podés eliminar tu propio usuario.");
		}

		// Sin este chequeo el borrado tira 500 por la FK tarea.responsable_id. Se bloquea en vez
		// de desasignar solo, para que nadie pierda de vista tareas que quedarían huérfanas.
		long tareasAsignadas = tareaRepository.countByResponsableId(id);
		if (tareasAsignadas > 0) {
			throw ServiceException.conflicto("El usuario tiene " + tareasAsignadas
					+ (tareasAsignadas == 1 ? " tarea asignada" : " tareas asignadas") + ". Reasignalas antes de eliminarlo.");
		}

		// Tampoco si figura en el historial de estados (FK historial_estado_tarea.usuario_id):
		// borrarlo o dejar el registro sin usuario haría perder quién hizo cada cambio, que es
		// la base de seguimiento/rendimiento y de la futura auditoría.
		if (historialEstadoTareaRepository.existsByUsuarioId(id)) {
			throw ServiceException.conflicto(
					"El usuario tiene cambios registrados en el historial de tareas, por lo que no se puede eliminar.");
		}

		usuarioRepository.delete(existente);
	}
}
