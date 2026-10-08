package com.seyco.gestion.entity;

import org.hibernate.annotations.ColumnDefault;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// Los permisos del rol no son columnas: salen de roles_modulos (leer/escribir/editar por
// módulo) y roles_paneles (pantallas que ve). Se administran desde la pantalla Roles.
@Entity
@Table(name = "roles")
public class Rol {

	public static final int TOKEN_DURACION_POR_DEFECTO = 60;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true, length = 50)
	private String nombre;

	// Minutos que dura una sesión. Con varios roles se toma el mayor (ver AuthService.login).
	@ColumnDefault("60")
	@Column(name = "token_duracion", nullable = false)
	private Integer tokenDuracion = TOKEN_DURACION_POR_DEFECTO;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getNombre() {
		return nombre;
	}

	public void setNombre(String nombre) {
		this.nombre = nombre;
	}

	public Integer getTokenDuracion() {
		return tokenDuracion;
	}

	public void setTokenDuracion(Integer tokenDuracion) {
		this.tokenDuracion = tokenDuracion;
	}
}
