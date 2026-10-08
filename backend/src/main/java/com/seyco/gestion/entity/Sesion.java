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
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

// Una fila por login. El token viaja en el header Authorization: Bearer y es válido mientras
// activo = true y fecha_expiracion no pasó (ver SesionRepository.buscarActiva). El logout,
// la baja del usuario o un cambio de contraseña lo desactivan.
@Entity
@Table(name = "sesiones", indexes = @Index(columnList = "token"))
public class Sesion {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String token;

	@Column(name = "fecha_login", nullable = false)
	private Instant fechaLogin;

	@Column(name = "fecha_logout")
	private Instant fechaLogout;

	@Column(nullable = false)
	private boolean activo;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "id_usuario", nullable = false)
	@OnDelete(action = OnDeleteAction.CASCADE)
	private Usuario usuario;

	@Column(name = "fecha_expiracion")
	private Instant fechaExpiracion;

	public Long getId() {
		return id;
	}

	public String getToken() {
		return token;
	}

	public void setToken(String token) {
		this.token = token;
	}

	public Instant getFechaLogin() {
		return fechaLogin;
	}

	public void setFechaLogin(Instant fechaLogin) {
		this.fechaLogin = fechaLogin;
	}

	public Instant getFechaLogout() {
		return fechaLogout;
	}

	public void setFechaLogout(Instant fechaLogout) {
		this.fechaLogout = fechaLogout;
	}

	public boolean isActivo() {
		return activo;
	}

	public void setActivo(boolean activo) {
		this.activo = activo;
	}

	public Usuario getUsuario() {
		return usuario;
	}

	public void setUsuario(Usuario usuario) {
		this.usuario = usuario;
	}

	public Instant getFechaExpiracion() {
		return fechaExpiracion;
	}

	public void setFechaExpiracion(Instant fechaExpiracion) {
		this.fechaExpiracion = fechaExpiracion;
	}
}
