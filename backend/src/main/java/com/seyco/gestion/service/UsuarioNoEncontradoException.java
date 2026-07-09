package com.seyco.gestion.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class UsuarioNoEncontradoException extends RuntimeException {

	public UsuarioNoEncontradoException() {
		super("El usuario no existe.");
	}
}
