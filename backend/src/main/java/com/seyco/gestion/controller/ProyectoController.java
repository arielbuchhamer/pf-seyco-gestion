package com.seyco.gestion.controller;

import java.util.List;
import java.util.Map;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.seyco.gestion.entity.EstadoProyecto;
import com.seyco.gestion.entity.Proyecto;
import com.seyco.gestion.service.ProyectoService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/proyectos")
public class ProyectoController {

	private final ProyectoService proyectoService;

	public ProyectoController(ProyectoService proyectoService) {
		this.proyectoService = proyectoService;
	}

	@GetMapping
	public List<Proyecto> listar(@RequestParam(required = false) String nombre,
			@RequestParam(required = false) EstadoProyecto estado) {
		return proyectoService.listar(nombre, estado);
	}

	@GetMapping("/{id}")
	public Proyecto buscarPorId(@PathVariable Long id) {
		return proyectoService.buscarPorId(id);
	}

	// Alta, modificación y baja de proyectos son del Gerente de Proyecto (Historia #5, CUU_9,
	// CUU_10), que en esta app es el ADMINISTRADOR. Ver/seguir proyectos queda para todos.
	@PostMapping
	@PreAuthorize("hasRole('ADMINISTRADOR')")
	public ResponseEntity<Proyecto> crear(@Valid @RequestBody Proyecto proyecto) {
		Proyecto creado = proyectoService.crear(proyecto);
		return ResponseEntity.status(HttpStatus.CREATED).body(creado);
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasRole('ADMINISTRADOR')")
	public Proyecto actualizar(@PathVariable Long id, @RequestBody Proyecto cambios) {
		return proyectoService.actualizar(id, cambios);
	}

	@GetMapping("/{id}/progreso")
	public Map<String, Object> progreso(@PathVariable Long id) {
		return proyectoService.progreso(id);
	}

	@GetMapping("/{id}/rendimiento")
	public Map<String, Object> rendimiento(@PathVariable Long id) {
		return proyectoService.rendimiento(id);
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('ADMINISTRADOR')")
	public ResponseEntity<Void> eliminar(@PathVariable Long id) {
		proyectoService.eliminar(id);
		return ResponseEntity.noContent().build();
	}
}
