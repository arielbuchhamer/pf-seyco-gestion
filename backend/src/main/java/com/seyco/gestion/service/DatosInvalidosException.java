package com.seyco.gestion.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class DatosInvalidosException extends RuntimeException {

	public DatosInvalidosException(String mensaje) {
		super(mensaje);
	}
}
