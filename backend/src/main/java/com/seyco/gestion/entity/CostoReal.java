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
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

// Gasto real de la obra (horas de grúa contratadas, compra de materiales, una cuadrilla de
// terceros...). Se carga por rubro para compararlo con lo cotizado en el presupuesto: si se
// cotizaron $30 M de grúa y ya van $40 M, el rubro Equipos queda en rojo (ver IndicadoresService).
@Entity
@Table(name = "costo_real")
public class CostoReal {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@JsonIgnore
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "proyecto_id", nullable = false)
	private Proyecto proyecto;

	@Column(nullable = false)
	private LocalDate fecha;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Rubro rubro;

	@Column(nullable = false, length = 300)
	private String descripcion;

	// Factura, remito u orden de compra del gasto (opcional).
	@Column(length = 100)
	private String comprobante;

	// En pesos, sin IVA (igual que el presupuesto).
	@Column(nullable = false, precision = 19, scale = 2)
	private BigDecimal monto;

	public Long getId() {
		return id;
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

	public Rubro getRubro() {
		return rubro;
	}

	public void setRubro(Rubro rubro) {
		this.rubro = rubro;
	}

	public String getDescripcion() {
		return descripcion;
	}

	public void setDescripcion(String descripcion) {
		this.descripcion = descripcion;
	}

	public String getComprobante() {
		return comprobante;
	}

	public void setComprobante(String comprobante) {
		this.comprobante = comprobante;
	}

	public BigDecimal getMonto() {
		return monto;
	}

	public void setMonto(BigDecimal monto) {
		this.monto = monto;
	}
}
