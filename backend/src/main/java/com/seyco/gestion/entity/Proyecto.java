package com.seyco.gestion.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "proyecto")
public class Proyecto {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@NotBlank
	@Column(nullable = false, unique = true, length = 150)
	private String nombre;

	@Column(length = 1000)
	private String descripcion;

	@Column(name = "fecha_inicio")
	private LocalDate fechaInicio;

	@Column(name = "fecha_fin")
	private LocalDate fechaFin;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private EstadoProyecto estado;

	// Datos del cliente, del encabezado del Excel ("A:"/"Sres:", "V/Ref:", "At:"); editables al importar.
	@Column(length = 200)
	private String cliente;

	@Column(name = "ref_cliente", length = 200)
	private String refCliente;

	@Column(length = 200)
	private String atencion;

	// Clasificación para filtrar el portafolio (EPE, Vialidad, privados, industrias y, dentro de
	// eso, zanjeo, iluminación, redes, obra industrial). Opcionales: se cargan al importar o editar.
	@Enumerated(EnumType.STRING)
	@Column(name = "tipo_cliente", length = 20)
	private TipoCliente tipoCliente;

	@Enumerated(EnumType.STRING)
	@Column(name = "tipo_obra", length = 20)
	private TipoObra tipoObra;

	// Origen del proyecto: el Excel del que se importó (el archivo en sí está en ArchivoProyecto).
	// Los dos los completa la importación; no se editan.
	@Column(name = "archivo_nombre", length = 255)
	private String archivoNombre;

	@Column(name = "fecha_importacion")
	private LocalDateTime fechaImportacion;

	// Cuándo se fijó la línea base (ProyectoService.fijarLineaBase). Null = el proyecto está en
	// planificación: las fechas plan de las tareas (y las del proyecto) todavía se editan y no
	// se cargan fechas reales. Una vez fijada, el plan queda congelado y el desvío se mide contra él.
	@Column(name = "linea_base_fecha")
	private LocalDateTime lineaBaseFecha;

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

	public EstadoProyecto getEstado() {
		return estado;
	}

	public void setEstado(EstadoProyecto estado) {
		this.estado = estado;
	}

	public String getCliente() {
		return cliente;
	}

	public void setCliente(String cliente) {
		this.cliente = cliente;
	}

	public String getRefCliente() {
		return refCliente;
	}

	public void setRefCliente(String refCliente) {
		this.refCliente = refCliente;
	}

	public String getAtencion() {
		return atencion;
	}

	public void setAtencion(String atencion) {
		this.atencion = atencion;
	}

	public TipoCliente getTipoCliente() {
		return tipoCliente;
	}

	public void setTipoCliente(TipoCliente tipoCliente) {
		this.tipoCliente = tipoCliente;
	}

	public TipoObra getTipoObra() {
		return tipoObra;
	}

	public void setTipoObra(TipoObra tipoObra) {
		this.tipoObra = tipoObra;
	}

	public String getArchivoNombre() {
		return archivoNombre;
	}

	public void setArchivoNombre(String archivoNombre) {
		this.archivoNombre = archivoNombre;
	}

	public LocalDateTime getFechaImportacion() {
		return fechaImportacion;
	}

	public void setFechaImportacion(LocalDateTime fechaImportacion) {
		this.fechaImportacion = fechaImportacion;
	}

	public LocalDateTime getLineaBaseFecha() {
		return lineaBaseFecha;
	}

	public void setLineaBaseFecha(LocalDateTime lineaBaseFecha) {
		this.lineaBaseFecha = lineaBaseFecha;
	}
}
