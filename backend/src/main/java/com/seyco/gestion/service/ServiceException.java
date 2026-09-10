package com.seyco.gestion.service;

import org.springframework.http.HttpStatus;

// Única excepción para errores de negocio en los services: lleva el status HTTP junto
// con el mensaje en vez de definir una clase distinta por caso (no encontrado, conflicto, etc.).
// GlobalExceptionHandler la traduce a la respuesta con un solo @ExceptionHandler.
public class ServiceException extends RuntimeException {

	private final HttpStatus status;

	public ServiceException(HttpStatus status, String mensaje) {
		super(mensaje);
		this.status = status;
	}

	public static ServiceException noEncontrado(String mensaje) {
		return new ServiceException(HttpStatus.NOT_FOUND, mensaje);
	}

	public static ServiceException conflicto(String mensaje) {
		return new ServiceException(HttpStatus.CONFLICT, mensaje);
	}

	public static ServiceException datosInvalidos(String mensaje) {
		return new ServiceException(HttpStatus.BAD_REQUEST, mensaje);
	}

	public static ServiceException credencialesInvalidas() {
		// Mensaje deliberadamente genérico: no debe permitir distinguir si la cuenta existe o no.
		return new ServiceException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
	}

	public HttpStatus getStatus() {
		return status;
	}
}
