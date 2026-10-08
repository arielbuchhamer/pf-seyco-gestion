package com.seyco.gestion.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.seyco.gestion.dto.Mensaje;
import com.seyco.gestion.service.ServiceException;

// Centraliza el manejo de errores para todos los controllers con el formato
// { "message": "..." } (el mismo que usan las respuestas 401/403 de SecurityConfig), para
// que el frontend pueda mostrar el motivo real. Spring Boot lo ocultaría por defecto
// (server.error.include-message=never).
@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(ServiceException.class)
	public ResponseEntity<Mensaje> handleServiceException(ServiceException ex) {
		return ResponseEntity.status(ex.getStatus()).body(new Mensaje(ex.getMessage()));
	}

	// @Valid (ej. email con formato inválido) o un JSON que no se puede leer (ej. DNI con letras).
	@ExceptionHandler({ MethodArgumentNotValidException.class, HttpMessageNotReadableException.class })
	public ResponseEntity<Mensaje> handleDatosInvalidos(Exception ex) {
		return ResponseEntity.status(HttpStatus.BAD_REQUEST)
				.body(new Mensaje("Hay datos inválidos. Revisá el formulario e intentá nuevamente."));
	}
}
