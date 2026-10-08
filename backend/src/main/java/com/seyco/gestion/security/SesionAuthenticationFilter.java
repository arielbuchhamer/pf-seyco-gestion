package com.seyco.gestion.security;

import java.io.IOException;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.seyco.gestion.service.AuthService;
import com.seyco.gestion.service.PermisoService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// Lee "Authorization: Bearer <token>", busca la sesión activa en la tabla `sesiones` y deja
// al usuario autenticado con sus permisos como authorities "<modulo>:<accion>" (ej.
// "proyectos:leer"), que es lo que chequean los @PreAuthorize de los controllers.
// Los permisos se leen de la base en cada pedido: un cambio en Roles aplica al instante.
// Sin token o con uno inválido/vencido no autentica, y las rutas protegidas responden 401.
@Component
public class SesionAuthenticationFilter extends OncePerRequestFilter {

	private static final String PREFIJO = "Bearer ";

	private final AuthService authService;
	private final PermisoService permisoService;

	public SesionAuthenticationFilter(AuthService authService, PermisoService permisoService) {
		this.authService = authService;
		this.permisoService = permisoService;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {

		String header = request.getHeader(HttpHeaders.AUTHORIZATION);

		if (header != null && header.startsWith(PREFIJO)) {
			authService.autenticar(header.substring(PREFIJO.length()).trim()).ifPresent(usuario -> {
				var authorities = permisoService.authorities(permisoService.obtenerPermisos(usuario.id()));
				var authentication = new UsernamePasswordAuthenticationToken(usuario, null, authorities);
				SecurityContextHolder.getContext().setAuthentication(authentication);
			});
		}

		filterChain.doFilter(request, response);
	}
}
