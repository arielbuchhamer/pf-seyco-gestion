package com.seyco.gestion.service;

/**
 * Se lanza tanto si el email no existe como si la contraseña no matchea.
 * El mensaje es deliberadamente genérico: no debe permitir distinguir
 * si la cuenta existe o no.
 */
public class CredencialesInvalidasException extends RuntimeException {

	public CredencialesInvalidasException() {
		super("Credenciales inválidas");
	}
}
