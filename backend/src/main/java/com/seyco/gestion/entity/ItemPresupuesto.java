package com.seyco.gestion.entity;

import java.math.BigDecimal;

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

// Renglón del presupuesto, en árbol: capítulo › grupo › armado › ítem (ver TipoItemPresupuesto).
// Los capítulos y grupos apuntan a la Tarea que se creó para ellos; armados e ítems no son
// tareas y cuelgan del grupo (o del capítulo, si el capítulo no tiene grupos).
// Montos de venta en pesos, sin IVA. total = manoObra + equipos + materiales + terceros;
// en capítulos, grupos y armados es la suma de sus hijos.
@Entity
@Table(name = "item_presupuesto")
public class ItemPresupuesto {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@JsonIgnore
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "presupuesto_id", nullable = false)
	private Presupuesto presupuesto;

	@JsonIgnore
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "padre_id")
	private ItemPresupuesto padre;

	@JsonIgnore
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "tarea_id")
	private Tarea tarea;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private TipoItemPresupuesto tipo;

	@Column(length = 20)
	private String numero;

	@Column(length = 100)
	private String codigo;

	@Column(length = 1000)
	private String descripcion;

	@Column(precision = 19, scale = 4)
	private BigDecimal cantidad;

	@Column(length = 20)
	private String unidad;

	@Column(name = "mano_obra", precision = 19, scale = 2)
	private BigDecimal manoObra;

	@Column(precision = 19, scale = 2)
	private BigDecimal equipos;

	@Column(precision = 19, scale = 2)
	private BigDecimal materiales;

	@Column(precision = 19, scale = 2)
	private BigDecimal terceros;

	@Column(precision = 19, scale = 2)
	private BigDecimal total;

	private Integer orden;

	public Long getId() {
		return id;
	}

	public Presupuesto getPresupuesto() {
		return presupuesto;
	}

	public void setPresupuesto(Presupuesto presupuesto) {
		this.presupuesto = presupuesto;
	}

	public ItemPresupuesto getPadre() {
		return padre;
	}

	public void setPadre(ItemPresupuesto padre) {
		this.padre = padre;
	}

	public Tarea getTarea() {
		return tarea;
	}

	public void setTarea(Tarea tarea) {
		this.tarea = tarea;
	}

	public TipoItemPresupuesto getTipo() {
		return tipo;
	}

	public void setTipo(TipoItemPresupuesto tipo) {
		this.tipo = tipo;
	}

	public String getNumero() {
		return numero;
	}

	public void setNumero(String numero) {
		this.numero = numero;
	}

	public String getCodigo() {
		return codigo;
	}

	public void setCodigo(String codigo) {
		this.codigo = codigo;
	}

	public String getDescripcion() {
		return descripcion;
	}

	public void setDescripcion(String descripcion) {
		this.descripcion = descripcion;
	}

	public BigDecimal getCantidad() {
		return cantidad;
	}

	public void setCantidad(BigDecimal cantidad) {
		this.cantidad = cantidad;
	}

	public String getUnidad() {
		return unidad;
	}

	public void setUnidad(String unidad) {
		this.unidad = unidad;
	}

	public BigDecimal getManoObra() {
		return manoObra;
	}

	public void setManoObra(BigDecimal manoObra) {
		this.manoObra = manoObra;
	}

	public BigDecimal getEquipos() {
		return equipos;
	}

	public void setEquipos(BigDecimal equipos) {
		this.equipos = equipos;
	}

	public BigDecimal getMateriales() {
		return materiales;
	}

	public void setMateriales(BigDecimal materiales) {
		this.materiales = materiales;
	}

	public BigDecimal getTerceros() {
		return terceros;
	}

	public void setTerceros(BigDecimal terceros) {
		this.terceros = terceros;
	}

	public BigDecimal getTotal() {
		return total;
	}

	public void setTotal(BigDecimal total) {
		this.total = total;
	}

	public Integer getOrden() {
		return orden;
	}

	public void setOrden(Integer orden) {
		this.orden = orden;
	}
}
