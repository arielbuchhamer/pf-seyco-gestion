package com.seyco.gestion.controller;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.seyco.gestion.entity.Usuario;
import com.seyco.gestion.security.JwtAuthenticationFilter;
import com.seyco.gestion.service.AuthService;
import com.seyco.gestion.service.JwtService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;
	private final JwtService jwtService;

	@Value("${app.cookie.secure}")
	private boolean cookieSecure;

	public AuthController(AuthService authService, JwtService jwtService) {
		this.authService = authService;
		this.jwtService = jwtService;
	}

	@PostMapping("/login")
	public ResponseEntity<Usuario> login(@Valid @RequestBody Usuario credenciales) {
		Usuario usuario = authService.login(credenciales);
		String token = jwtService.generateToken(usuario);

		return ResponseEntity.ok()
				.header(HttpHeaders.SET_COOKIE, buildCookie(token, jwtService.getExpirationMs()).toString())
				.body(usuario);
	}

	@PostMapping("/logout")
	public ResponseEntity<Void> logout() {
		return ResponseEntity.noContent()
				.header(HttpHeaders.SET_COOKIE, buildCookie("", 0).toString())
				.build();
	}

	@GetMapping("/me")
	public ResponseEntity<Usuario> me(Authentication authentication) {
		Usuario usuario = authService.buscarPorEmail(authentication.getName());
		return ResponseEntity.ok(usuario);
	}

	private ResponseCookie buildCookie(String token, long maxAgeMs) {
		return ResponseCookie.from(JwtAuthenticationFilter.COOKIE_NAME, token)
				.httpOnly(true)
				.secure(cookieSecure)
				.sameSite("Lax")
				.path("/")
				.maxAge(Duration.ofMillis(maxAgeMs))
				.build();
	}
}
