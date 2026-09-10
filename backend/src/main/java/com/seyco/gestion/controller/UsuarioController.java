package com.seyco.gestion.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.seyco.gestion.entity.Usuario;
import com.seyco.gestion.service.UsuarioService;

import jakarta.validation.Valid;

// Solo accesible para ADMINISTRADOR: restringido en SecurityConfig por path (/api/usuarios/**).
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

	private final UsuarioService usuarioService;

	public UsuarioController(UsuarioService usuarioService) {
		this.usuarioService = usuarioService;
	}

	@GetMapping
	public List<Usuario> listar() {
		return usuarioService.listar();
	}

	@PostMapping
	public ResponseEntity<Usuario> crear(@Valid @RequestBody Usuario usuario) {
		Usuario creado = usuarioService.crear(usuario);
		return ResponseEntity.status(HttpStatus.CREATED).body(creado);
	}

	@PutMapping("/{id}")
	public Usuario actualizar(@PathVariable Long id, @RequestBody Usuario cambios) {
		return usuarioService.actualizar(id, cambios);
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> eliminar(@PathVariable Long id, Authentication authentication) {
		usuarioService.eliminar(id, authentication.getName());
		return ResponseEntity.noContent().build();
	}
}
