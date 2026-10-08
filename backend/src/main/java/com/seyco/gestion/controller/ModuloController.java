package com.seyco.gestion.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.seyco.gestion.entity.Modulo;
import com.seyco.gestion.service.ModuloService;

// Los módulos se administran desde la pantalla de Roles: módulo `roles`.
@RestController
@RequestMapping("/api/modulos")
public class ModuloController {

	private final ModuloService moduloService;

	public ModuloController(ModuloService moduloService) {
		this.moduloService = moduloService;
	}

	@GetMapping
	@PreAuthorize("hasAuthority('roles:leer')")
	public List<Modulo> listar() {
		return moduloService.listar();
	}

	@PostMapping
	@PreAuthorize("hasAuthority('roles:escribir')")
	public ResponseEntity<Modulo> crear(@RequestBody Modulo modulo) {
		return ResponseEntity.status(HttpStatus.CREATED).body(moduloService.crear(modulo));
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAuthority('roles:editar')")
	public Modulo actualizar(@PathVariable Long id, @RequestBody Modulo cambios) {
		return moduloService.actualizar(id, cambios);
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasAuthority('roles:editar')")
	public ResponseEntity<Void> eliminar(@PathVariable Long id) {
		moduloService.eliminar(id);
		return ResponseEntity.noContent().build();
	}
}
