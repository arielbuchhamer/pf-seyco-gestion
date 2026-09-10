package com.seyco.gestion.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.seyco.gestion.entity.Usuario;
import com.seyco.gestion.repository.UsuarioRepository;

@Service
public class AuthService {

	private final UsuarioRepository usuarioRepository;
	private final PasswordEncoder passwordEncoder;

	public AuthService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
		this.usuarioRepository = usuarioRepository;
		this.passwordEncoder = passwordEncoder;
	}

	public Usuario login(Usuario credenciales) {
		Usuario usuario = usuarioRepository.findByEmail(credenciales.getEmail())
				.orElseThrow(ServiceException::credencialesInvalidas);

		if (!passwordEncoder.matches(credenciales.getClave(), usuario.getClave())) {
			throw ServiceException.credencialesInvalidas();
		}

		return usuario;
	}

	public Usuario buscarPorEmail(String email) {
		return usuarioRepository.findByEmail(email)
				.orElseThrow(ServiceException::credencialesInvalidas);
	}
}
