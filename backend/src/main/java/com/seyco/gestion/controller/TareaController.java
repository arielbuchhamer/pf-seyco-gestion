package com.seyco.gestion.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
	public List<Tarea> listar() {
		return tareaService.listar();
	}

	@GetMapping("/{id}")
	public Tarea buscarPorId(@PathVariable Long id) {
		return tareaService.buscarPorId(id);
	}

	@PostMapping
	public ResponseEntity<Tarea> crear(@Valid @RequestBody Tarea tarea) {
		Tarea creada = tareaService.crear(tarea);
		return ResponseEntity.status(HttpStatus.CREATED).body(creada);
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> eliminar(@PathVariable Long id) {
		tareaService.eliminar(id);
		return ResponseEntity.noContent().build();
	}
}
