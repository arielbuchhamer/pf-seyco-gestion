package com.seyco.gestion.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

// Excel original del que se importó el proyecto (tareas y presupuesto), para poder descargarlo
// tal cual. Tabla aparte para no traer el binario cada vez que se consulta el proyecto.
@Entity
@Table(name = "archivo_proyecto")
public class ArchivoProyecto {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@OneToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "proyecto_id", nullable = false, unique = true)
	private Proyecto proyecto;

	@Column(name = "tipo_contenido", length = 100)
	private String tipoContenido;

	@Column(nullable = false)
	private byte[] contenido;

	public Long getId() {
		return id;
	}

	public Proyecto getProyecto() {
		return proyecto;
	}

	public void setProyecto(Proyecto proyecto) {
		this.proyecto = proyecto;
	}

	public String getTipoContenido() {
		return tipoContenido;
	}

	public void setTipoContenido(String tipoContenido) {
		this.tipoContenido = tipoContenido;
	}

	public byte[] getContenido() {
		return contenido;
	}

	public void setContenido(byte[] contenido) {
		this.contenido = contenido;
	}
}
