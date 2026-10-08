package com.seyco.gestion.dto;

import java.time.Instant;
import java.util.List;

// Pedidos y respuestas de la administración de usuarios y roles.
public final class AccesoDtos {

	private AccesoDtos() {
	}

	public record RolResumen(Long id, String nombre) {
	}

	// Fila del listado de usuarios: datos + roles (roles_usuarios) + cantidad de sesiones.
	public record UsuarioListado(Long id, String email, String nombre, String apellido, Integer dni,
			String telefono, Instant fechaAlta, Instant fechaActualizacion, Instant fechaBaja,
			List<RolResumen> roles,
			long cantidadSesiones) {
	}

	// POST /api/roles/{id}/modulos y PUT /api/roles/{id}/modulos/{idModulo}
	public record PermisoModuloRequest(Long idModulo, boolean leer, boolean escribir, boolean editar) {
	}

	// POST /api/roles/{id}/paneles
	public record AsignarPanelRequest(Long idPanel) {
	}

	// POST /api/roles/{id}/usuarios
	public record AsignarUsuarioRequest(Long idUsuario) {
	}
}
