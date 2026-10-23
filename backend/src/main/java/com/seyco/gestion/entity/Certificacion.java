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

// Certificado de obra (= factura al cliente por lo ejecutado). El seguimiento evita que quede un
// saldo sin certificar o sin cobrar al terminar la obra (ver CertificacionService.resumen).
@Entity
@Table(name = "certificacion")
public class Certificacion {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@JsonIgnore
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "proyecto_id", nullable = false)
	private Proyecto proyecto;

	// Correlativo dentro del proyecto (1 = anticipo, normalmente).
	@Column(nullable = false)
	private Integer numero;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private TipoCertificacion tipo;

	@Column(name = "fecha_emision", nullable = false)
	private LocalDate fechaEmision;

	// Qué parte del contrato certifica (ej. 30 para el anticipo). Informativo: el monto manda.
	@Column(precision = 7, scale = 2)
	private BigDecimal porcentaje;

	// En pesos, sin IVA.
	@Column(nullable = false, precision = 19, scale = 2)
	private BigDecimal monto;

	@Column(name = "nro_factura", length = 50)
	private String nroFactura;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private EstadoCertificacion estado;

	@Column(name = "fecha_cobro")
	private LocalDate fechaCobro;

	@Column(length = 500)
	private String observaciones;

	public Long getId() {
		return id;
	}

	public Proyecto getProyecto() {
		return proyecto;
	}

	public void setProyecto(Proyecto proyecto) {
		this.proyecto = proyecto;
	}

	public Integer getNumero() {
		return numero;
	}

	public void setNumero(Integer numero) {
		this.numero = numero;
	}

	public TipoCertificacion getTipo() {
		return tipo;
	}

	public void setTipo(TipoCertificacion tipo) {
		this.tipo = tipo;
	}

	public LocalDate getFechaEmision() {
		return fechaEmision;
	}

	public void setFechaEmision(LocalDate fechaEmision) {
		this.fechaEmision = fechaEmision;
	}

	public BigDecimal getPorcentaje() {
		return porcentaje;
	}

	public void setPorcentaje(BigDecimal porcentaje) {
		this.porcentaje = porcentaje;
	}

	public BigDecimal getMonto() {
		return monto;
	}

	public void setMonto(BigDecimal monto) {
		this.monto = monto;
	}

	public String getNroFactura() {
		return nroFactura;
	}

	public void setNroFactura(String nroFactura) {
		this.nroFactura = nroFactura;
	}

	public EstadoCertificacion getEstado() {
		return estado;
	}

	public void setEstado(EstadoCertificacion estado) {
		this.estado = estado;
	}

	public LocalDate getFechaCobro() {
		return fechaCobro;
	}

	public void setFechaCobro(LocalDate fechaCobro) {
		this.fechaCobro = fechaCobro;
	}

	public String getObservaciones() {
		return observaciones;
	}

	public void setObservaciones(String observaciones) {
		this.observaciones = observaciones;
	}
}
