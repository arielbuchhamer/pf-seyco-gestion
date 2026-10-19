package com.seyco.gestion.dto;

// Pedidos de /api/perfil (el usuario logueado editando sus propios datos).
public final class PerfilDtos {

	private PerfilDtos() {
	}

	// Sin email, contraseña ni roles: desde el perfil sólo se editan los datos personales.
	// El DNI se recibe como texto (el front lo manda como string, o null si está vacío) para poder
	// responder "Sólo se aceptan números." si trae letras (con Integer, Jackson fallaría antes con
	// un mensaje genérico). Si un cliente lo manda como número JSON, Jackson lo pasa a texto.
	// Lo valida y convierte a número UsuarioService.
	public record ActualizarPerfilRequest(String nombre, String apellido, String dni, String telefono) {
	}
}
