package com.seyco.gestion.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class EmailYaRegistradoException extends RuntimeException {

	public EmailYaRegistradoException() {
		super("Ya existe un usuario registrado con ese email.");
	}
}
