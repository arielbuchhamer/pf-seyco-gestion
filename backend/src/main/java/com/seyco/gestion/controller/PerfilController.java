package com.seyco.gestion.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.seyco.gestion.dto.PerfilDtos.ActualizarPerfilRequest;
import com.seyco.gestion.entity.Usuario;
import com.seyco.gestion.security.UsuarioAutenticado;
import com.seyco.gestion.service.UsuarioService;

// Sin @PreAuthorize a propósito: cualquier usuario con sesión (de cualquier rol) puede ver y
// editar su propio perfil. SecurityConfig ya exige sesión, y el id sale siempre de la sesión
// (nunca de la URL ni del cuerpo), así que nadie puede tocar el perfil de otro.
@RestController
@RequestMapping("/api/perfil")
public class PerfilController {

	private final UsuarioService usuarioService;

	public PerfilController(UsuarioService usuarioService) {
		this.usuarioService = usuarioService;
	}

	@GetMapping
	public Usuario obtener(@AuthenticationPrincipal UsuarioAutenticado usuario) {
		return usuarioService.obtenerActivo(usuario.id());
	}

	@PutMapping
	public Usuario actualizar(@AuthenticationPrincipal UsuarioAutenticado usuario,
			@RequestBody ActualizarPerfilRequest pedido) {
		return usuarioService.actualizarPerfil(usuario.id(), pedido);
	}
}
