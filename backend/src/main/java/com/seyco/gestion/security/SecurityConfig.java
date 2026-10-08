package com.seyco.gestion.security;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import jakarta.servlet.http.HttpServletResponse;

// @EnableMethodSecurity: los permisos se declaran en cada endpoint con
// @PreAuthorize("hasAuthority('<modulo>:<accion>')"), según roles_modulos en la base
// (ver SesionAuthenticationFilter). Acá sólo queda "público vs. autenticado".
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

	@Value("${app.cors.allowed-origins}")
	private String allowedOrigins;

	@Bean
	SecurityFilterChain filterChain(HttpSecurity http, SesionAuthenticationFilter sesionAuthenticationFilter)
			throws Exception {
		http
				// El token viaja en el header Authorization (no en una cookie), así que el
				// navegador no lo manda solo desde otro sitio: no aplica el vector CSRF.
				.csrf(AbstractHttpConfigurer::disable)
				.cors(cors -> cors.configurationSource(corsConfigurationSource()))
				.sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/recuperar", "/api/auth/restablecer")
						.permitAll()
						// Imprescindible: al denegar un 401/403, Spring hace un forward interno a
						// /error para renderizarlo. Si ese forward vuelve a pasar por la cadena de
						// seguridad como no-autenticado, pisa el status original con un 401 propio.
						.requestMatchers("/error").permitAll()
						.anyRequest().authenticated())
				.addFilterBefore(sesionAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
				.exceptionHandling(ex -> ex
						.authenticationEntryPoint((request, response, e) -> responderJson(response,
								HttpServletResponse.SC_UNAUTHORIZED, "Sesión inválida, inactiva o expirada."))
						.accessDeniedHandler((request, response, e) -> responderJson(response,
								HttpServletResponse.SC_FORBIDDEN, "No tiene permisos para realizar esta acción.")));

		return http.build();
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	// Mismo formato { "message": ... } que GlobalExceptionHandler. Los mensajes son fijos (sin
	// comillas ni datos del usuario), por eso alcanza con armar el JSON a mano.
	private static void responderJson(HttpServletResponse response, int status, String mensaje) throws IOException {
		response.setStatus(status);
		response.setCharacterEncoding("UTF-8");
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.getWriter().write("{\"message\":\"" + mensaje + "\"}");
	}

	private CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration config = new CorsConfiguration();
		config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
		config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
		config.setAllowedHeaders(List.of("*"));

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);
		return source;
	}
}
