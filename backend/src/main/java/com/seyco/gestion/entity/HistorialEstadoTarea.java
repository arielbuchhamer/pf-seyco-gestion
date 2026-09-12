package com.seyco.gestion.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

// Se genera automáticamente en TareaService cada vez que cambia el estado de una tarea
// (incluida la creación); el usuario nunca escribe acá directamente. Alimenta el cálculo
// de rendimiento (duración real de cada tarea) y el historial de seguimiento (Historia #8).
@Entity
@Table(name = "historial_estado_tarea")
public class HistorialEstadoTarea {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "tarea_id", nullable = false)
	private Tarea tarea;

	// Null en el primer registro (creación de la tarea: no hay estado anterior).
	@Enumerated(EnumType.STRING)
	@Column(name = "estado_anterior", length = 20)
	private EstadoTarea estadoAnterior;

	@Enumerated(EnumType.STRING)
	@Column(name = "estado_nuevo", nullable = false, length = 20)
	private EstadoTarea estadoNuevo;

	@Column(name = "fecha_hora", nullable = false)
	private LocalDateTime fechaHora;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "usuario_id")
	private Usuario usuario;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public Tarea getTarea() {
		return tarea;
	}

	public void setTarea(Tarea tarea) {
		this.tarea = tarea;
	}

	public EstadoTarea getEstadoAnterior() {
		return estadoAnterior;
	}

	public void setEstadoAnterior(EstadoTarea estadoAnterior) {
		this.estadoAnterior = estadoAnterior;
	}

	public EstadoTarea getEstadoNuevo() {
		return estadoNuevo;
	}

	public void setEstadoNuevo(EstadoTarea estadoNuevo) {
		this.estadoNuevo = estadoNuevo;
	}

	public LocalDateTime getFechaHora() {
		return fechaHora;
	}

	public void setFechaHora(LocalDateTime fechaHora) {
		this.fechaHora = fechaHora;
	}

	public Usuario getUsuario() {
		return usuario;
	}

	public void setUsuario(Usuario usuario) {
		this.usuario = usuario;
	}
}
