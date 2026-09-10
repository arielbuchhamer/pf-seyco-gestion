package com.seyco.gestion.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.seyco.gestion.service.ServiceException;

// Centraliza el manejo de errores de negocio para todos los controllers. Spring Boot
// oculta el mensaje real de la excepción en el body por defecto (server.error.include-message=never);
// este handler lo devuelve explícito para que el frontend pueda mostrar el motivo real.
@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(ServiceException.class)
	public ResponseEntity<String> handleServiceException(ServiceException ex) {
		return ResponseEntity.status(ex.getStatus()).body(ex.getMessage());
	}
}
