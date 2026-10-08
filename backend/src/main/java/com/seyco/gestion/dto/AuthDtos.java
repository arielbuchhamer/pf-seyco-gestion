package com.seyco.gestion.dto;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

// Cuerpos de pedido/respuesta de /api/auth. Mismo formato que el proyecto de referencia
// (CONTEXTO), con los nombres de campo en camelCase como el resto de esta API.
public final class AuthDtos {

	private AuthDtos() {
	}

	public record LoginRequest(String email, String contrasena) {
	}

	public record RecuperarRequest(String email) {
	}

	public record RestablecerRequest(String token, String contrasena) {
	}

	public record UsuarioSesion(Long id, String email, String nombre, String apellido, List<String> roles) {
	}

	// { paneles: ['paneles-proyectos', ...], modulos: { proyectos: { leer, escribir, editar }, ... } }
	public record Permisos(List<String> paneles, Map<String, PermisoModulo> modulos) {
	}

	public record PermisoModulo(boolean leer, boolean escribir, boolean editar) {

		// Un usuario con varios roles tiene la unión de los permisos.
		public PermisoModulo unir(PermisoModulo otro) {
			return new PermisoModulo(leer || otro.leer, escribir || otro.escribir, editar || otro.editar);
		}
	}

	// Respuesta del login (con token) y de /me (sin token).
	@JsonInclude(JsonInclude.Include.NON_NULL)
	public record RespuestaAuth(String message, String token, UsuarioSesion usuario, Permisos permisos) {
	}
}
