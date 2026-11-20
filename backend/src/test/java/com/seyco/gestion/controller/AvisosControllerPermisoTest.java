package com.seyco.gestion.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import com.seyco.gestion.dto.SeguimientoDtos.Avisos;
import com.seyco.gestion.dto.SeguimientoDtos.TotalesAvisos;
import com.seyco.gestion.service.AvisosService;

// Prueba el @PreAuthorize real del controlador con la seguridad por método activa, sin base de datos.
@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = AvisosControllerPermisoTest.Config.class)
class AvisosControllerPermisoTest {

	@Configuration
	@EnableMethodSecurity
	static class Config {

		@Bean
		AvisosService avisosService() {
			AvisosService servicio = mock(AvisosService.class);
			when(servicio.avisos()).thenReturn(new Avisos(new TotalesAvisos(0, 0, 0, 0), List.of()));
			return servicio;
		}

		@Bean
		AvisosController avisosController(AvisosService avisosService) {
			return new AvisosController(avisosService);
		}
	}

	@Autowired
	private AvisosController controller;

	@Test
	@WithMockUser(authorities = "proyectos:leer")
	void conPermisoDeLeerProyectosResponde() {
		assertEquals(0, controller.avisos().totales().criticos());
	}

	@Test
	@WithMockUser(authorities = "usuarios:leer")
	void conPermisoDeOtroModuloSeDeniega() {
		assertThrows(AccessDeniedException.class, () -> controller.avisos());
	}

	@Test
	@WithMockUser(authorities = "proyectos:escribir")
	void conOtraAccionDelMismoModuloSeDeniega() {
		assertThrows(AccessDeniedException.class, () -> controller.avisos());
	}

	@Test
	@WithMockUser
	void sinPermisosSeDeniega() {
		assertThrows(AccessDeniedException.class, () -> controller.avisos());
	}
}
