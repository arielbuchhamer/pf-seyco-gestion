package com.seyco.gestion.entity;

import java.time.Instant;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

// Pedidos de "¿Olvidaste tu contraseña?". Se guarda el hash (SHA-256) del token que viaja
// en el link del correo, nunca el token en sí. fecha_uso con valor = link usado o invalidado.
@Entity
@Table(name = "recuperaciones_contrasena")
public class RecuperacionContrasena {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "token_hash", nullable = false, unique = true, length = 64)
	private String tokenHash;

	@Column(name = "fecha_alta", nullable = false)
	private Instant fechaAlta;

	@Column(name = "fecha_expiracion", nullable = false)
	private Instant fechaExpiracion;

	@Column(name = "fecha_uso")
	private Instant fechaUso;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "id_usuario", nullable = false)
	@OnDelete(action = OnDeleteAction.CASCADE)
	private Usuario usuario;

	public Long getId() {
		return id;
	}

	public String getTokenHash() {
		return tokenHash;
	}

	public void setTokenHash(String tokenHash) {
		this.tokenHash = tokenHash;
	}

	public Instant getFechaAlta() {
		return fechaAlta;
	}

	public void setFechaAlta(Instant fechaAlta) {
		this.fechaAlta = fechaAlta;
	}

	public Instant getFechaExpiracion() {
		return fechaExpiracion;
	}

	public void setFechaExpiracion(Instant fechaExpiracion) {
		this.fechaExpiracion = fechaExpiracion;
	}

	public Instant getFechaUso() {
		return fechaUso;
	}

	public void setFechaUso(Instant fechaUso) {
		this.fechaUso = fechaUso;
	}

	public Usuario getUsuario() {
		return usuario;
	}

	public void setUsuario(Usuario usuario) {
		this.usuario = usuario;
	}
}
