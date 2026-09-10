package com.seyco.gestion.service;

import java.util.List;
import java.util.regex.Pattern;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.seyco.gestion.entity.Usuario;
import com.seyco.gestion.repository.UsuarioRepository;

@Service
public class UsuarioService {

	// Regla simplificada respecto al relevamiento original (mayúscula + carácter especial quedaron afuera): 8+ caracteres y 1 número.
	private static final Pattern PASSWORD_PATTERN =
			Pattern.compile("^(?=.*\\d).{8,}$");

	private final UsuarioRepository usuarioRepository;
	private final PasswordEncoder passwordEncoder;

	public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
		this.usuarioRepository = usuarioRepository;
		this.passwordEncoder = passwordEncoder;
	}

	public List<Usuario> listar() {
		return usuarioRepository.findAll();
	}

	public Usuario crear(Usuario nuevo) {
		if (nuevo.getRol() == null) {
			throw ServiceException.datosInvalidos("El rol es obligatorio.");
		}
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

		usuarioRepository.findByEmail(cambios.getEmail())
				.filter(otro -> !otro.getId().equals(id))
				.ifPresent(otro -> {
					throw ServiceException.conflicto("Ya existe un usuario registrado con ese email.");
				});

		existente.setEmail(cambios.getEmail());
		existente.setRol(cambios.getRol());

		String nuevaClave = cambios.getClave();
		if (nuevaClave != null && !nuevaClave.isBlank()) {
			if (!PASSWORD_PATTERN.matcher(nuevaClave).matches()) {
				throw ServiceException.datosInvalidos("La contraseña debe tener al menos 8 caracteres y un número.");
			}
			existente.setClave(passwordEncoder.encode(nuevaClave));
		}

		return usuarioRepository.save(existente);
	}

	public void eliminar(Long id, String emailSolicitante) {
		Usuario existente = usuarioRepository.findById(id)
				.orElseThrow(() -> ServiceException.noEncontrado("El usuario no existe."));

		if (existente.getEmail().equalsIgnoreCase(emailSolicitante)) {
			throw ServiceException.datosInvalidos("No podés eliminar tu propio usuario.");
		}

		usuarioRepository.delete(existente);
	}
}
