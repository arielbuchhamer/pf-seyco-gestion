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
	public List<Proyecto> listar() {
		return proyectoService.listar();
	}

	@GetMapping("/{id}")
	public Proyecto buscarPorId(@PathVariable Long id) {
		return proyectoService.buscarPorId(id);
	}

	@PostMapping
	public ResponseEntity<Proyecto> crear(@Valid @RequestBody Proyecto proyecto) {
		Proyecto creado = proyectoService.crear(proyecto);
		return ResponseEntity.status(HttpStatus.CREATED).body(creado);
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> eliminar(@PathVariable Long id) {
		proyectoService.eliminar(id);
		return ResponseEntity.noContent().build();
	}
}
