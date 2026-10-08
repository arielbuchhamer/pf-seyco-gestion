package com.seyco.gestion.service;

import java.io.UnsupportedEncodingException;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

// Correos automáticos del sistema (recuperación de contraseña). Se configura con las
// variables MAIL_* de backend/.env (ver application.properties). Si no hay MAIL_HOST,
// estaConfigurado() da false y quien llama decide qué hacer (RecuperacionService
// escribe el link en el log para poder probar el flujo en desarrollo).
@Service
public class CorreoService {

	private final ObjectProvider<JavaMailSender> mailSender;
	private final String host;
	private final String from;
	private final String fromName;

	public CorreoService(ObjectProvider<JavaMailSender> mailSender,
			@Value("${spring.mail.host:}") String host,
			@Value("${app.mail.from:}") String from,
			@Value("${spring.mail.username:}") String username,
			@Value("${app.mail.from-name:Seyco S.A}") String fromName) {
		this.mailSender = mailSender;
		this.host = host;
		this.from = from.isBlank() ? username : from;
		this.fromName = fromName;
	}

	public boolean estaConfigurado() {
		return !host.isBlank() && !from.isBlank() && mailSender.getIfAvailable() != null;
	}

	public void enviarRecuperacion(String email, String nombre, String link, int minutos)
			throws MessagingException, UnsupportedEncodingException {
		String html = plantilla("Restablecer tu contraseña", """
				<p>Hola %s,</p>
				<p>Recibimos un pedido para restablecer la contraseña de tu cuenta.
				   Para elegir una nueva, hacé clic en el botón:</p>
				%s
				<p>El enlace vence en %d minutos y se puede usar una sola vez.</p>
				<p style="font-size: 12px; color: #555;">Si el botón no funciona, copiá este enlace en tu navegador:<br>
				   <span style="word-break: break-all;">%s</span></p>
				<p>Si no pediste este cambio, ignorá este correo: tu contraseña sigue siendo la misma.</p>
				""".formatted(HtmlUtils.htmlEscape(nombre == null ? "" : nombre), boton(link, "Restablecer contraseña"),
				minutos, HtmlUtils.htmlEscape(link)));

		enviar(email, "Restablecer contraseña - Seyco S.A", html);
	}

	private void enviar(String para, String asunto, String html) throws MessagingException, UnsupportedEncodingException {
		JavaMailSender sender = mailSender.getObject();
		MimeMessage mensaje = sender.createMimeMessage();
		MimeMessageHelper helper = new MimeMessageHelper(mensaje, "UTF-8");
		helper.setFrom(from, fromName);
		helper.setTo(para);
		helper.setSubject(asunto);
		helper.setText(html, true);
		sender.send(mensaje);
	}

	private static String boton(String url, String texto) {
		return """
				<p style="margin: 24px 0;">
				    <a href="%s" style="background: #0f5fa6; color: #ffffff; padding: 12px 22px;
				       border-radius: 6px; text-decoration: none; font-weight: bold;">%s</a>
				</p>""".formatted(HtmlUtils.htmlEscape(url), texto);
	}

	private static String plantilla(String titulo, String contenido) {
		return """
				<div style="font-family: Arial, sans-serif; color: #222; max-width: 600px;">
				    <h2 style="color: #0f5fa6;">%s</h2>
				    %s
				    <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
				    <p style="color: #777; font-size: 12px;">
				        Seyco S.A - Gestión de obras.<br>
				        Este es un mensaje automático, por favor no respondas a este correo.
				    </p>
				</div>""".formatted(titulo, contenido);
	}
}
