package com.seyco.gestion.entity;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

// Tabla `usuarios` de la gestión de accesos (database/1-crearTablasGestionDeAccesos.sql).
// Los roles no viven acá sino en roles_usuarios (un usuario puede tener varios).
// La baja es lógica: fecha_baja con valor = usuario dado de baja (no puede iniciar sesión
// y no aparece en los listados), así no se pierde quién hizo cada cambio en el historial.
@Entity
@Table(name = "usuarios")
public class Usuario {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	// Sin unique en la base (igual que el proyecto de referencia): el email sólo no puede
	// repetirse entre usuarios activos, y eso lo valida UsuarioService.
	@NotBlank
	@Email
	@Column(nullable = false, length = 50)
	private String email;

	@Column(length = 50)
	private String nombre;

	@Column(length = 50)
	private String apellido;

	// Hash BCrypt. Se acepta en el JSON de entrada (alta/edición) pero nunca se serializa de vuelta.
	@JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
	@Column(nullable = false, length = 255)
	private String contrasena;

	private Integer dni;

	private String telefono;

	@Column(name = "fecha_alta", nullable = false)
	private Instant fechaAlta;

	@Column(name = "fecha_actualizacion")
	private Instant fechaActualizacion;

	@Column(name = "fecha_baja")
	private Instant fechaBaja;

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

	public String getNombre() {
		return nombre;
	}

	public void setNombre(String nombre) {
		this.nombre = nombre;
	}

	public String getApellido() {
		return apellido;
	}

	public void setApellido(String apellido) {
		this.apellido = apellido;
	}

	public String getContrasena() {
		return contrasena;
	}

	public void setContrasena(String contrasena) {
		this.contrasena = contrasena;
	}

	public Integer getDni() {
		return dni;
	}

	public void setDni(Integer dni) {
		this.dni = dni;
	}

	public String getTelefono() {
		return telefono;
	}

	public void setTelefono(String telefono) {
		this.telefono = telefono;
	}

	public Instant getFechaAlta() {
		return fechaAlta;
	}

	public void setFechaAlta(Instant fechaAlta) {
		this.fechaAlta = fechaAlta;
	}

	public Instant getFechaActualizacion() {
		return fechaActualizacion;
	}

	public void setFechaActualizacion(Instant fechaActualizacion) {
		this.fechaActualizacion = fechaActualizacion;
	}

	public Instant getFechaBaja() {
		return fechaBaja;
	}

	public void setFechaBaja(Instant fechaBaja) {
		this.fechaBaja = fechaBaja;
	}
}
