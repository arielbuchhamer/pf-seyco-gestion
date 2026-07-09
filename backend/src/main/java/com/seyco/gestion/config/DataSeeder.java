package com.seyco.gestion.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.seyco.gestion.entity.Rol;
import com.seyco.gestion.entity.Usuario;
import com.seyco.gestion.repository.UsuarioRepository;

/**
 * Siembra un usuario administrador de prueba mientras no exista pantalla de registro.
 * Credenciales de prueba (solo desarrollo): admin@seyco.com / admin123
 */
@Configuration
public class DataSeeder {

	private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
	private static final String ADMIN_EMAIL = "admin@seyco.com";
	private static final String ADMIN_PASSWORD = "admin123";

	@Bean
	CommandLineRunner seedAdminUser(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
		return args -> {
			if (usuarioRepository.findByEmail(ADMIN_EMAIL).isEmpty()) {
				Usuario admin = new Usuario();
				admin.setEmail(ADMIN_EMAIL);
				admin.setClave(passwordEncoder.encode(ADMIN_PASSWORD));
				admin.setRol(Rol.ADMINISTRADOR);
				usuarioRepository.save(admin);
				log.info("Usuario admin de prueba sembrado: {} / {}", ADMIN_EMAIL, ADMIN_PASSWORD);
			}
		};
	}
}
