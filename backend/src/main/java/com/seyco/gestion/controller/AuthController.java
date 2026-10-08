package com.seyco.gestion.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.seyco.gestion.dto.AuthDtos.LoginRequest;
import com.seyco.gestion.dto.AuthDtos.RecuperarRequest;
import com.seyco.gestion.dto.AuthDtos.RespuestaAuth;
import com.seyco.gestion.dto.AuthDtos.RestablecerRequest;
import com.seyco.gestion.dto.Mensaje;
import com.seyco.gestion.security.UsuarioAutenticado;
import com.seyco.gestion.service.AuthService;
import com.seyco.gestion.service.RecuperacionService;

// Públicas (ver SecurityConfig): login, recuperar y restablecer. El resto exige sesión.
@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;
	private final RecuperacionService recuperacionService;

	public AuthController(AuthService authService, RecuperacionService recuperacionService) {
		this.authService = authService;
		this.recuperacionService = recuperacionService;
	}

	// Devuelve el token de sesión, el usuario con sus roles y sus permisos (paneles y módulos).
	@PostMapping("/login")
	public RespuestaAuth login(@RequestBody LoginRequest credenciales) {
		return authService.login(credenciales);
	}

	@PostMapping("/logout")
	public Mensaje logout(@AuthenticationPrincipal UsuarioAutenticado usuario) {
		authService.logout(usuario.token());
		return new Mensaje("Sesión cerrada correctamente.");
	}

	@GetMapping("/me")
	public RespuestaAuth me(@AuthenticationPrincipal UsuarioAutenticado usuario) {
		return authService.perfil(usuario.id());
	}

	// "¿Olvidaste tu contraseña?": mismo mensaje exista o no la cuenta.
	@PostMapping("/recuperar")
	public Mensaje recuperar(@RequestBody RecuperarRequest pedido) {
		recuperacionService.solicitar(pedido.email());
		return new Mensaje("Si el correo está registrado, te enviamos un enlace para restablecer la contraseña. "
				+ "Revisá tu bandeja de entrada (y la carpeta de spam).");
	}

	@PostMapping("/restablecer")
	public Mensaje restablecer(@RequestBody RestablecerRequest pedido) {
		recuperacionService.restablecer(pedido.token(), pedido.contrasena());
		return new Mensaje("¡Listo! Tu contraseña fue actualizada. Ya podés iniciar sesión.");
	}
}
