package com.seyco.gestion.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;

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
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

@Entity
@Table(name = "tarea")
public class Tarea {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@NotBlank
	@Column(nullable = false, length = 150)
	private String nombre;

	@Column(length = 1000)
	private String descripcion;

	@Column(name = "fecha_inicio")
	private LocalDate fechaInicio;

	@Column(name = "fecha_fin")
	private LocalDate fechaFin;

	// Seguimiento de fechas (solapa Tareas del proyecto). fechaInicio/fechaFin son el plan: se
	// editan mientras el proyecto está en planificación y quedan congeladas como línea base al
	// fijarla (Proyecto.lineaBaseFecha). Las reales se cargan recién después; fechaFinReal es
	// "fin estimado / real": mientras la tarea sigue abierta es la estimación de cuándo termina.
	// En una tarea con subtareas las cuatro fechas son el consolidado de sus subtareas.
	@Column(name = "fecha_inicio_real")
	private LocalDate fechaInicioReal;

	@Column(name = "fecha_fin_real")
	private LocalDate fechaFinReal;

	// % de avance físico (0-100), cargado junto con las fechas reales. Con el monto presupuestado
	// de cada tarea da el avance real ponderado del proyecto (ver IndicadoresService). En una
	// tarea con subtareas es el promedio de ellas.
	private Integer avance;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private EstadoTarea estado;

	@Enumerated(EnumType.STRING)
	@Column(length = 10)
	private Prioridad prioridad;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "proyecto_id", nullable = false)
	private Proyecto proyecto;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "responsable_id")
	private Usuario responsable;

	// Subtareas: un grupo del presupuesto (stN,M) es una Tarea cuyo padre es la tarea del
	// capítulo (stN). Las tareas de primer nivel no tienen padre. En el JSON sólo va el id
	// (padreId) para no serializar el árbol hacia arriba.
	@JsonIgnore
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "padre_id")
	private Tarea padre;

	// Numeración visible ("2", "2.1") y posición entre hermanas, tal como vienen del Excel.
	@Column(length = 20)
	private String numero;

	private Integer orden;

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

	public String getDescripcion() {
		return descripcion;
	}

	public void setDescripcion(String descripcion) {
		this.descripcion = descripcion;
	}

	public LocalDate getFechaInicio() {
		return fechaInicio;
	}

	public void setFechaInicio(LocalDate fechaInicio) {
		this.fechaInicio = fechaInicio;
	}

	public LocalDate getFechaFin() {
		return fechaFin;
	}

	public void setFechaFin(LocalDate fechaFin) {
		this.fechaFin = fechaFin;
	}

	public LocalDate getFechaInicioReal() {
		return fechaInicioReal;
	}

	public void setFechaInicioReal(LocalDate fechaInicioReal) {
		this.fechaInicioReal = fechaInicioReal;
	}

	public LocalDate getFechaFinReal() {
		return fechaFinReal;
	}

	public void setFechaFinReal(LocalDate fechaFinReal) {
		this.fechaFinReal = fechaFinReal;
	}

	public Integer getAvance() {
		return avance;
	}

	public void setAvance(Integer avance) {
		this.avance = avance;
	}

	public EstadoTarea getEstado() {
		return estado;
	}

	public void setEstado(EstadoTarea estado) {
		this.estado = estado;
	}

	public Prioridad getPrioridad() {
		return prioridad;
	}

	public void setPrioridad(Prioridad prioridad) {
		this.prioridad = prioridad;
	}

	public Proyecto getProyecto() {
		return proyecto;
	}

	public void setProyecto(Proyecto proyecto) {
		this.proyecto = proyecto;
	}

	public Usuario getResponsable() {
		return responsable;
	}

	public void setResponsable(Usuario responsable) {
		this.responsable = responsable;
	}

	public Tarea getPadre() {
		return padre;
	}

	public void setPadre(Tarea padre) {
		this.padre = padre;
	}

	public Long getPadreId() {
		return padre == null ? null : padre.getId();
	}

	public String getNumero() {
		return numero;
	}

	public void setNumero(String numero) {
		this.numero = numero;
	}

	public Integer getOrden() {
		return orden;
	}

	public void setOrden(Integer orden) {
		this.orden = orden;
	}
}
