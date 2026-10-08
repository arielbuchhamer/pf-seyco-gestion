package com.seyco.gestion.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.seyco.gestion.dto.AccesoDtos.AsignarPanelRequest;
import com.seyco.gestion.dto.AccesoDtos.AsignarUsuarioRequest;
import com.seyco.gestion.dto.AccesoDtos.PermisoModuloRequest;
import com.seyco.gestion.entity.Rol;
import com.seyco.gestion.entity.RolModulo;
import com.seyco.gestion.entity.RolPanel;
import com.seyco.gestion.service.RolService;

/*
 * Roles, sus módulos, paneles y usuarios: módulo `roles` (en la base, sólo admin). Asignar
 * roles a usuarios también pasa por acá: sin esto, cualquiera que pueda editar usuarios
 * podría darse el rol admin.
 */
@RestController
@RequestMapping("/api/roles")
public class RolController {

	private final RolService rolService;

	public RolController(RolService rolService) {
		this.rolService = rolService;
	}

	// --- ROL ---

	@GetMapping
	@PreAuthorize("hasAuthority('roles:leer')")
	public List<Rol> listar() {
		return rolService.listar();
	}

	@PostMapping
	@PreAuthorize("hasAuthority('roles:escribir')")
	public ResponseEntity<Rol> crear(@RequestBody Rol rol) {
		return ResponseEntity.status(HttpStatus.CREATED).body(rolService.crear(rol));
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAuthority('roles:editar')")
	public Rol actualizar(@PathVariable Long id, @RequestBody Rol cambios) {
		return rolService.actualizar(id, cambios);
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasAuthority('roles:editar')")
	public ResponseEntity<Void> eliminar(@PathVariable Long id) {
		rolService.eliminar(id);
		return ResponseEntity.noContent().build();
	}

	// --- MÓDULOS DEL ROL (los permisos se cambian, y se quitan, con PUT) ---

	@GetMapping("/{id}/modulos")
	@PreAuthorize("hasAuthority('roles:leer')")
	public List<RolModulo> listarModulos(@PathVariable Long id) {
		return rolService.modulos(id);
	}

	@PostMapping("/{id}/modulos")
	@PreAuthorize("hasAuthority('roles:escribir')")
	public ResponseEntity<RolModulo> asignarModulo(@PathVariable Long id, @RequestBody PermisoModuloRequest permisos) {
		return ResponseEntity.status(HttpStatus.CREATED).body(rolService.asignarModulo(id, permisos));
	}

	@PutMapping("/{id}/modulos/{idModulo}")
	@PreAuthorize("hasAuthority('roles:editar')")
	public RolModulo actualizarModulo(@PathVariable Long id, @PathVariable Long idModulo,
			@RequestBody PermisoModuloRequest permisos) {
		return rolService.actualizarModulo(id, idModulo, permisos);
	}

	// --- PANELES DEL ROL ---

	@GetMapping("/{id}/paneles")
	@PreAuthorize("hasAuthority('roles:leer')")
	public List<RolPanel> listarPaneles(@PathVariable Long id) {
		return rolService.paneles(id);
	}

	@PostMapping("/{id}/paneles")
	@PreAuthorize("hasAuthority('roles:escribir')")
	public ResponseEntity<RolPanel> asignarPanel(@PathVariable Long id, @RequestBody AsignarPanelRequest pedido) {
		return ResponseEntity.status(HttpStatus.CREATED).body(rolService.asignarPanel(id, pedido.idPanel()));
	}

	@DeleteMapping("/{id}/paneles/{idPanel}")
	@PreAuthorize("hasAuthority('roles:editar')")
	public ResponseEntity<Void> desasignarPanel(@PathVariable Long id, @PathVariable Long idPanel) {
		rolService.desasignarPanel(id, idPanel);
		return ResponseEntity.noContent().build();
	}

	// --- USUARIOS DEL ROL ---

	@PostMapping("/{id}/usuarios")
	@PreAuthorize("hasAuthority('roles:escribir')")
	public ResponseEntity<Void> asignarUsuario(@PathVariable Long id, @RequestBody AsignarUsuarioRequest pedido) {
		rolService.asignarUsuario(id, pedido.idUsuario());
		return ResponseEntity.status(HttpStatus.CREATED).build();
	}

	@DeleteMapping("/{id}/usuarios/{idUsuario}")
	@PreAuthorize("hasAuthority('roles:editar')")
	public ResponseEntity<Void> desasignarUsuario(@PathVariable Long id, @PathVariable Long idUsuario) {
		rolService.desasignarUsuario(id, idUsuario);
		return ResponseEntity.noContent().build();
	}
}
