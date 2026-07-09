package com.seyco.gestion.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "usuario")
public class Usuario {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@NotBlank
	@Email
	@Column(nullable = false, unique = true, length = 150)
	private String email;

	// Se acepta en el JSON de entrada (login) pero nunca se serializa de vuelta:
	// evita que el hash de la contraseña salga en ninguna respuesta sin necesitar un DTO aparte.
	@NotBlank
	@JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
	@Column(nullable = false, length = 100)
	private String clave;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Rol rol;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getClave() {
		return clave;
	}

	public void setClave(String clave) {
		this.clave = clave;
	}

	public Rol getRol() {
		return rol;
	}

	public void setRol(Rol rol) {
		this.rol = rol;
	}
}
