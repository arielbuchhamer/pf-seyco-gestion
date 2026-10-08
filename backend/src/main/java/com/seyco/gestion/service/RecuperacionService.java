package com.seyco.gestion.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.seyco.gestion.entity.RecuperacionContrasena;
import com.seyco.gestion.entity.Usuario;
import com.seyco.gestion.repository.RecuperacionContrasenaRepository;
import com.seyco.gestion.repository.SesionRepository;
import com.seyco.gestion.repository.UsuarioRepository;
import com.seyco.gestion.security.Tokens;

/*
 * RECUPERACIÓN DE CONTRASEÑA
 *   1. solicitar(email): si la cuenta existe, envía un link con un token de un solo uso que
 *      vence en MINUTOS_VIGENCIA. En la base sólo se guarda el hash del token.
 *   2. restablecer(token, contraseña): valida el token, cambia la contraseña y cierra las
 *      sesiones abiertas de ese usuario.
 */
@Service
public class RecuperacionService {

	public static final int MINUTOS_VIGENCIA = 60;

	// No se manda otro correo si ya se pidió uno hace menos de esto.
	private static final int SEGUNDOS_ENTRE_PEDIDOS = 60;

	private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

	private static final Logger log = LoggerFactory.getLogger(RecuperacionService.class);

	private final UsuarioRepository usuarioRepository;
	private final RecuperacionContrasenaRepository recuperacionRepository;
	private final SesionRepository sesionRepository;
	private final CorreoService correoService;
	private final PasswordEncoder passwordEncoder;
	private final String appUrl;

	public RecuperacionService(UsuarioRepository usuarioRepository, RecuperacionContrasenaRepository recuperacionRepository,
			SesionRepository sesionRepository, CorreoService correoService, PasswordEncoder passwordEncoder,
			@Value("${app.url}") String appUrl) {
		this.usuarioRepository = usuarioRepository;
		this.recuperacionRepository = recuperacionRepository;
		this.sesionRepository = sesionRepository;
		this.correoService = correoService;
		this.passwordEncoder = passwordEncoder;
		this.appUrl = appUrl.replaceAll("/+$", "");
	}

	// No informa si el email existe o no (así no se puede averiguar quién tiene cuenta):
	// el controller responde siempre el mismo mensaje.
	@Transactional
	public void solicitar(String email) {
		String limpio = email == null ? "" : email.trim();
		if (!EMAIL.matcher(limpio).matches()) {
			throw ServiceException.datosInvalidos("Ingresá un correo electrónico válido.");
		}

		Usuario usuario = usuarioRepository.findByEmailIgnoreCaseAndFechaBajaIsNull(limpio).orElse(null);
		if (usuario == null) {
			return;
		}

		Instant ahora = Instant.now();
		if (recuperacionRepository.existsByUsuarioIdAndFechaUsoIsNullAndFechaAltaAfter(usuario.getId(),
				ahora.minusSeconds(SEGUNDOS_ENTRE_PEDIDOS))) {
			return;
		}

		String token = Tokens.generar();

		recuperacionRepository.invalidarPendientes(usuario.getId(), ahora);

		RecuperacionContrasena pedido = new RecuperacionContrasena();
		pedido.setTokenHash(Tokens.sha256(token));
		pedido.setFechaAlta(ahora);
		pedido.setFechaExpiracion(ahora.plus(MINUTOS_VIGENCIA, ChronoUnit.MINUTES));
		pedido.setUsuario(usuario);
		recuperacionRepository.save(pedido);

		String link = appUrl + "/login?restablecer=" + token;

		if (!correoService.estaConfigurado()) {
			// Desarrollo sin SMTP: el link queda en el log para poder probar el flujo.
			log.warn("Correo no configurado (MAIL_HOST). Link de recuperación para {}: {}", usuario.getEmail(), link);
			return;
		}

		try {
			correoService.enviarRecuperacion(usuario.getEmail(), usuario.getNombre(), link, MINUTOS_VIGENCIA);
		} catch (Exception e) {
			log.error("No se pudo enviar el correo de recuperación (usuario {})", usuario.getId(), e);
			// Al lanzar se hace rollback: el pedido no queda guardado y se puede reintentar enseguida.
			throw ServiceException.servicioNoDisponible("No se pudo enviar el correo. Intentá nuevamente en unos minutos.");
		}
	}

	@Transactional
	public void restablecer(String token, String contrasena) {
		if (!Tokens.esValido(token)) {
			throw ServiceException.datosInvalidos("El enlace no es válido. Pedí uno nuevo.");
		}
		UsuarioService.validarContrasena(contrasena);

		Instant ahora = Instant.now();
		RecuperacionContrasena pedido = recuperacionRepository.buscarVigente(Tokens.sha256(token), ahora)
				.orElseThrow(() -> ServiceException.datosInvalidos("El enlace venció o ya fue usado. Pedí uno nuevo."));

		Usuario usuario = pedido.getUsuario();
		usuario.setContrasena(passwordEncoder.encode(contrasena));
		usuario.setFechaActualizacion(ahora);

		recuperacionRepository.invalidarPendientes(usuario.getId(), ahora);
		// Con la contraseña nueva, las sesiones abiertas dejan de valer.
		sesionRepository.cerrarTodas(usuario.getId(), ahora);
	}
}
