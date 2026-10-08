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

import com.seyco.gestion.entity.Panel;
import com.seyco.gestion.service.PanelService;

// Los paneles se administran desde la pantalla de Roles: módulo `roles`.
@RestController
@RequestMapping("/api/paneles")
public class PanelController {

	private final PanelService panelService;

	public PanelController(PanelService panelService) {
		this.panelService = panelService;
	}

	@GetMapping
	@PreAuthorize("hasAuthority('roles:leer')")
	public List<Panel> listar() {
		return panelService.listar();
	}

	@PostMapping
	@PreAuthorize("hasAuthority('roles:escribir')")
	public ResponseEntity<Panel> crear(@RequestBody Panel panel) {
		return ResponseEntity.status(HttpStatus.CREATED).body(panelService.crear(panel));
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAuthority('roles:editar')")
	public Panel actualizar(@PathVariable Long id, @RequestBody Panel cambios) {
		return panelService.actualizar(id, cambios);
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasAuthority('roles:editar')")
	public ResponseEntity<Void> eliminar(@PathVariable Long id) {
		panelService.eliminar(id);
		return ResponseEntity.noContent().build();
	}
}
