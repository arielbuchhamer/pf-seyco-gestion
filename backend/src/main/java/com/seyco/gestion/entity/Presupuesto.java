package com.seyco.gestion.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

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
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

// Presupuesto del proyecto (1:1): sólo los datos de la cotización. Los renglones están en
// ItemPresupuesto. Lo que es de la obra (cliente, referencias) y el Excel original del que se
// importó todo son del Proyecto (ver Proyecto y ArchivoProyecto).
@Entity
@Table(name = "presupuesto")
public class Presupuesto {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@JsonIgnore
	@OneToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "proyecto_id", nullable = false, unique = true)
	private Proyecto proyecto;

	// Fecha de la cotización (encabezado del Excel).
	private LocalDate fecha;

	@Column(name = "plazo_dias")
	private Integer plazoDias;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private EstadoPresupuesto estado;

	// Total general sin IVA, en pesos (suma de los capítulos).
	@Column(precision = 19, scale = 2)
	private BigDecimal total;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public Proyecto getProyecto() {
		return proyecto;
	}

	public void setProyecto(Proyecto proyecto) {
		this.proyecto = proyecto;
	}

	public LocalDate getFecha() {
		return fecha;
	}

	public void setFecha(LocalDate fecha) {
		this.fecha = fecha;
	}

	public Integer getPlazoDias() {
		return plazoDias;
	}

	public void setPlazoDias(Integer plazoDias) {
		this.plazoDias = plazoDias;
	}

	public EstadoPresupuesto getEstado() {
		return estado;
	}

	public void setEstado(EstadoPresupuesto estado) {
		this.estado = estado;
	}

	public BigDecimal getTotal() {
		return total;
	}

	public void setTotal(BigDecimal total) {
		this.total = total;
	}
}
