package com.seyco.gestion.entity;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

// Roles de cada usuario. Con varios roles, sus permisos son la unión (ver PermisoService).
@Entity
@Table(name = "roles_usuarios", uniqueConstraints = @UniqueConstraint(columnNames = { "id_rol", "id_usuario" }))
public class RolUsuario {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(optional = false)
	@JoinColumn(name = "id_rol", nullable = false)
	@OnDelete(action = OnDeleteAction.CASCADE)
	private Rol rol;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "id_usuario", nullable = false)
	@OnDelete(action = OnDeleteAction.CASCADE)
	private Usuario usuario;

	public RolUsuario() {
	}

	public RolUsuario(Rol rol, Usuario usuario) {
		this.rol = rol;
		this.usuario = usuario;
	}

	public Long getId() {
		return id;
	}

	public Rol getRol() {
		return rol;
	}

	public Usuario getUsuario() {
		return usuario;
	}
}
