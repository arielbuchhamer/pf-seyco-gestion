package com.seyco.gestion.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.seyco.gestion.dto.AccesoDtos.UsuarioListado;
import com.seyco.gestion.entity.Usuario;
import com.seyco.gestion.service.UsuarioService;

import jakarta.validation.Valid;

// Patrón para restringir un endpoint: @PreAuthorize("hasAuthority('<modulo>:<accion>')"), con
// GET -> leer, POST -> escribir y PUT/PATCH/DELETE -> editar. Los permisos de cada rol se
// configuran en la base (roles_modulos) desde la pantalla Roles. Sin el permiso: 403.
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

	private final UsuarioService usuarioService;

	public UsuarioController(UsuarioService usuarioService) {
		this.usuarioService = usuarioService;
	}

	@GetMapping
	@PreAuthorize("hasAuthority('usuarios:leer')")
	public List<UsuarioListado> listar() {
		return usuarioService.listar();
	}

	// El rol se asigna después con POST /api/roles/{id}/usuarios (módulo `roles`).
	@PostMapping
	@PreAuthorize("hasAuthority('usuarios:escribir')")
	public ResponseEntity<Usuario> crear(@Valid @RequestBody Usuario usuario) {
		Usuario creado = usuarioService.crear(usuario);
		return ResponseEntity.status(HttpStatus.CREATED).body(creado);
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAuthority('usuarios:editar')")
	public Usuario actualizar(@PathVariable Long id, @RequestBody Usuario cambios) {
		return usuarioService.actualizar(id, cambios);
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasAuthority('usuarios:editar')")
	public ResponseEntity<Void> eliminar(@PathVariable Long id, Authentication authentication) {
		usuarioService.eliminar(id, authentication.getName());
		return ResponseEntity.noContent().build();
	}
}
