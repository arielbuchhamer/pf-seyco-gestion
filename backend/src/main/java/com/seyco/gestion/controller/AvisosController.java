package com.seyco.gestion.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.seyco.gestion.dto.SeguimientoDtos.Avisos;
import com.seyco.gestion.service.AvisosService;

// Avisos de todas las obras (campanita y pantalla Avisos). Usa el permiso de leer proyectos,
// igual que el portafolio.
@RestController
@RequestMapping("/api/avisos")
public class AvisosController {

	private final AvisosService avisosService;

	public AvisosController(AvisosService avisosService) {
		this.avisosService = avisosService;
	}

	@GetMapping
	@PreAuthorize("hasAuthority('proyectos:leer')")
	public Avisos avisos() {
		return avisosService.avisos();
	}
}
