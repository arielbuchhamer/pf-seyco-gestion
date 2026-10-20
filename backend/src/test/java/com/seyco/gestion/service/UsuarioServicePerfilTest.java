package com.seyco.gestion.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.seyco.gestion.dto.PerfilDtos.ActualizarPerfilRequest;
import com.seyco.gestion.entity.Usuario;
import com.seyco.gestion.repository.RolUsuarioRepository;
import com.seyco.gestion.repository.SesionRepository;
import com.seyco.gestion.repository.TareaRepository;
import com.seyco.gestion.repository.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class UsuarioServicePerfilTest {

	private static final Long ID = 7L;
	private static final String EMAIL = "persona@ejemplo.com";

	@Mock
	private UsuarioRepository usuarioRepository;
	@Mock
	private RolUsuarioRepository rolUsuarioRepository;
	@Mock
	private SesionRepository sesionRepository;
	@Mock
	private TareaRepository tareaRepository;
	@Mock
	private PasswordEncoder passwordEncoder;

	private UsuarioService usuarioService;
	private Usuario existente;

	@BeforeEach
	void preparar() {
		usuarioService = new UsuarioService(usuarioRepository, rolUsuarioRepository, sesionRepository,
				tareaRepository, passwordEncoder);

		existente = new Usuario();
		existente.setId(ID);
		existente.setEmail(EMAIL);
		existente.setNombre("Nombre");
		existente.setApellido("Apellido");
		existente.setDni(11111111);
		existente.setTelefono("1111-1111");
		existente.setFechaAlta(Instant.parse("2026-01-01T00:00:00Z"));

		when(usuarioRepository.findByIdAndFechaBajaIsNull(ID)).thenReturn(Optional.of(existente));
		lenient().when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
	}

	@Test
	void actualizaLosDatosPersonalesSinCambiarElEmail() {
		Usuario resultado = usuarioService.actualizarPerfil(ID,
				new ActualizarPerfilRequest("  Ana ", " Pérez  ", "22222222", " 22222222 "));

		assertEquals("Ana", resultado.getNombre());
		assertEquals("Pérez", resultado.getApellido());
		assertEquals(22222222, resultado.getDni());
		assertEquals("22222222", resultado.getTelefono());
		assertEquals(EMAIL, resultado.getEmail());
		assertNotNull(resultado.getFechaActualizacion());
		verify(usuarioRepository).save(existente);
	}

	@Test
	void telefonoEnBlancoQuedaNulo() {
		Usuario resultado = usuarioService.actualizarPerfil(ID,
				new ActualizarPerfilRequest("Ana", "Pérez", null, "   "));

		assertNull(resultado.getTelefono());
		assertNull(resultado.getDni());
	}

	@Test
	void nombreVacioEsInvalidoYNoModificaAlUsuario() {
		ServiceException error = assertThrows(ServiceException.class, () -> usuarioService.actualizarPerfil(ID,
				new ActualizarPerfilRequest("  ", "Pérez", "22222222", null)));

		assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
		assertEquals("El nombre es obligatorio.", error.getMessage());
		assertSinCambios();
	}

	@Test
	void apellidoVacioEsInvalidoYNoModificaAlUsuario() {
		ServiceException error = assertThrows(ServiceException.class, () -> usuarioService.actualizarPerfil(ID,
				new ActualizarPerfilRequest("Ana", null, "22222222", null)));

		assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
		assertEquals("El apellido es obligatorio.", error.getMessage());
		assertSinCambios();
	}

	@ParameterizedTest
	@ValueSource(strings = { "1234567", "12345678", " 12345678 " })
	void dniDe7u8DigitosEsValido(String dni) {
		Usuario resultado = usuarioService.actualizarPerfil(ID, new ActualizarPerfilRequest("Ana", "Pérez", dni, null));

		assertEquals(Integer.valueOf(dni.trim()), resultado.getDni());
	}

	@ParameterizedTest
	@ValueSource(strings = { "", "   " })
	void dniVacioEsValidoYQuedaNulo(String dni) {
		Usuario resultado = usuarioService.actualizarPerfil(ID, new ActualizarPerfilRequest("Ana", "Pérez", dni, null));

		assertNull(resultado.getDni());
	}

	// También cuando además faltan o sobran dígitos: el mensaje de "sólo números" tiene prioridad.
	@ParameterizedTest
	@ValueSource(strings = { "1234567a", "12.345.678", "-1234567", "12 345 678", "12a", "1234567890a" })
	void dniConCaracteresNoNumericosEsInvalidoYNoModificaAlUsuario(String dni) {
		assertErrorSinCambios(new ActualizarPerfilRequest("Ana", "Pérez", dni, null), "Sólo se aceptan números.");
	}

	@ParameterizedTest
	@ValueSource(strings = { "123456", "123456789", "0", "01234567", "0123456" })
	void dniConCantidadDeDigitosIncorrectaOCeroInicialEsInvalidoYNoModificaAlUsuario(String dni) {
		assertErrorSinCambios(new ActualizarPerfilRequest("Ana", "Pérez", dni, null), "DNI inválido.");
	}

	@Test
	void telefonoSoloConNumerosEsValido() {
		Usuario resultado = usuarioService.actualizarPerfil(ID,
				new ActualizarPerfilRequest("Ana", "Pérez", null, "1145678901"));

		assertEquals("1145678901", resultado.getTelefono());
	}

	@ParameterizedTest
	@ValueSource(strings = { "11-4567-8901", "+541145678901", "11 4567 8901", "abc123", "(011)45678901" })
	void telefonoConLetrasOSimbolosEsInvalidoYNoModificaAlUsuario(String telefono) {
		assertErrorSinCambios(new ActualizarPerfilRequest("Ana", "Pérez", null, telefono), "Sólo se aceptan números.");
	}

	@Test
	void telefonoDe50DigitosEsValido() {
		String telefono = "1".repeat(50);
		Usuario resultado = usuarioService.actualizarPerfil(ID, new ActualizarPerfilRequest("Ana", "Pérez", null, telefono));

		assertEquals(telefono, resultado.getTelefono());
	}

	@Test
	void telefonoDe51DigitosEsInvalidoYNoModificaAlUsuario() {
		assertErrorSinCambios(new ActualizarPerfilRequest("Ana", "Pérez", null, "1".repeat(51)),
				"El teléfono puede tener hasta 50 caracteres.");
	}

	private void assertErrorSinCambios(ActualizarPerfilRequest pedido, String mensaje) {
		ServiceException error = assertThrows(ServiceException.class,
				() -> usuarioService.actualizarPerfil(ID, pedido));

		assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
		assertEquals(mensaje, error.getMessage());
		assertSinCambios();
	}

	private void assertSinCambios() {
		assertEquals("Nombre", existente.getNombre());
		assertEquals("Apellido", existente.getApellido());
		assertEquals(11111111, existente.getDni());
		assertEquals("1111-1111", existente.getTelefono());
		assertEquals(EMAIL, existente.getEmail());
		assertNull(existente.getFechaActualizacion());
		verify(usuarioRepository, never()).save(any());
	}
}
