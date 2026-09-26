package com.seyco.gestion.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.seyco.gestion.entity.EstadoTarea;
import com.seyco.gestion.entity.Tarea;
import com.seyco.gestion.service.TareaService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/tareas")
public class TareaController {

	private final TareaService tareaService;

	public TareaController(TareaService tareaService) {
		this.tareaService = tareaService;
	}

	@GetMapping
	public List<Tarea> listar(@RequestParam(required = false) Long proyectoId) {
		return tareaService.listar(proyectoId);
	}

	// Tareas asignadas al usuario logueado, de todos los proyectos (pantalla "Tareas").
	@GetMapping("/mias")
	public List<Tarea> listarMias(Authentication authentication) {
		return tareaService.listarAsignadas(authentication.getName());
	}

	@GetMapping("/{id}")
	public Tarea buscarPorId(@PathVariable Long id) {
		return tareaService.buscarPorId(id);
	}

	// Crear, editar (incluye reasignar el responsable) y borrar tareas es del Gerente de
	// Proyecto (Historias #6 y #7), que en esta app es el ADMINISTRADOR.
	@PostMapping
	@PreAuthorize("hasRole('ADMINISTRADOR')")
	public ResponseEntity<Tarea> crear(@Valid @RequestBody Tarea tarea, Authentication authentication) {
		Tarea creada = tareaService.crear(tarea, authentication.getName());
		return ResponseEntity.status(HttpStatus.CREATED).body(creada);
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasRole('ADMINISTRADOR')")
	public Tarea actualizar(@PathVariable Long id, @RequestBody Tarea cambios) {
		return tareaService.actualizar(id, cambios);
	}

	// Cambio de estado separado del resto de la edición: es la acción que se dispara todo
	// el tiempo desde el tablero de tareas, y la que genera el historial de seguimiento/rendimiento.
	// Sin @PreAuthorize: el permiso depende de si es responsable de la tarea (ver TareaService).
	@PatchMapping("/{id}/estado")
	public Tarea cambiarEstado(@PathVariable Long id, @RequestParam EstadoTarea estado, Authentication authentication) {
		return tareaService.cambiarEstado(id, estado, authentication.getName());
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('ADMINISTRADOR')")
	public ResponseEntity<Void> eliminar(@PathVariable Long id) {
		tareaService.eliminar(id);
		return ResponseEntity.noContent().build();
	}
}
