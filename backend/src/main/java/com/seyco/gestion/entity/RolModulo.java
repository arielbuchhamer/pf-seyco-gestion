package com.seyco.gestion.entity;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

// Permisos de un rol sobre un módulo:
//   leer -> consultar (GET)   escribir -> dar de alta (POST)   editar -> modificar y dar de baja (PUT/PATCH/DELETE)
@Entity
@Table(name = "roles_modulos", uniqueConstraints = @UniqueConstraint(columnNames = { "id_rol", "id_modulo" }))
public class RolModulo {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private Boolean editar;

	private Boolean escribir;

	private Boolean leer;

	@JsonIgnore
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "id_rol", nullable = false)
	@OnDelete(action = OnDeleteAction.CASCADE)
	private Rol rol;

	@ManyToOne(optional = false)
	@JoinColumn(name = "id_modulo", nullable = false)
	@OnDelete(action = OnDeleteAction.CASCADE)
	private Modulo modulo;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public boolean isEditar() {
		return Boolean.TRUE.equals(editar);
	}

	public void setEditar(Boolean editar) {
		this.editar = editar;
	}

	public boolean isEscribir() {
		return Boolean.TRUE.equals(escribir);
	}

	public void setEscribir(Boolean escribir) {
		this.escribir = escribir;
	}

	public boolean isLeer() {
		return Boolean.TRUE.equals(leer);
	}

	public void setLeer(Boolean leer) {
		this.leer = leer;
	}

	public Rol getRol() {
		return rol;
	}

	public void setRol(Rol rol) {
		this.rol = rol;
	}

	public Modulo getModulo() {
		return modulo;
	}

	public void setModulo(Modulo modulo) {
		this.modulo = modulo;
	}
}
