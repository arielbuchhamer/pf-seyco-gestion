package com.seyco.gestion.dto;

// Pedidos de /api/perfil (el usuario logueado editando sus propios datos).
public final class PerfilDtos {

	private PerfilDtos() {
	}

	// Sin email, contraseña ni roles. El DNI llega como texto para poder responder
	// "Sólo se aceptan números." (con Integer, Jackson fallaría antes con un mensaje genérico).
	public record ActualizarPerfilRequest(String nombre, String apellido, String dni, String telefono) {
	}
}
