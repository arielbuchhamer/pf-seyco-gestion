package com.seyco.gestion.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.seyco.gestion.entity.EstadoPresupuesto;
import com.seyco.gestion.entity.TipoItemPresupuesto;

// Importación de proyectos desde el Excel de presupuesto de Seyco y consulta del presupuesto.
public final class ImportacionDtos {

	private ImportacionDtos() {
	}

	// Renglón del árbol del presupuesto (capítulo › grupo › armado › ítem). Lo usan tanto la
	// previsualización (tareaId = null, todavía no hay tareas) como el presupuesto ya guardado.
	public record NodoPresupuesto(TipoItemPresupuesto tipo, String numero, String codigo, String descripcion,
			BigDecimal cantidad, String unidad, BigDecimal manoObra, BigDecimal equipos, BigDecimal materiales,
			BigDecimal terceros, BigDecimal unitario, BigDecimal total, Long tareaId, List<NodoPresupuesto> hijos) {
	}

	public record TotalesRubro(BigDecimal manoObra, BigDecimal equipos, BigDecimal materiales, BigDecimal terceros,
			BigDecimal total) {
	}

	public enum NivelVerificacion {
		OK, ADVERTENCIA, ERROR
	}

	// Un chequeo de la "Verificación automática". Con algún ERROR no se puede crear el proyecto.
	public record Verificacion(NivelVerificacion nivel, String titulo, String detalle) {
	}

	// Datos del encabezado del Excel, precargados en el formulario "Datos del proyecto".
	public record EncabezadoPresupuesto(String obra, String cliente, String atencion, String refCliente,
			LocalDate fecha, Integer plazoDias) {
	}

	// POST /api/proyectos/importacion/previsualizar
	public record PrevisualizacionImportacion(String archivoNombre, EncabezadoPresupuesto encabezado,
			int cantidadTareas, int cantidadSubtareas, int cantidadItems, int filasOmitidas,
			TotalesRubro totales, List<Verificacion> verificaciones, boolean puedeImportar,
			List<NodoPresupuesto> items) {
	}

	// POST /api/proyectos/importacion (parte "datos" del multipart, junto con el "archivo").
	// Los valores del formulario "Datos del proyecto": precargados desde el Excel y editables.
	public record DatosImportacion(String nombre, String cliente, String refCliente, String atencion,
			String descripcion, LocalDate fechaInicio, LocalDate fechaFin) {
	}

	// GET /api/proyectos/{id}/presupuesto
	public record PresupuestoDetalle(Long id, LocalDate fecha, Integer plazoDias, EstadoPresupuesto estado,
			TotalesRubro totales, List<NodoPresupuesto> items) {
	}
}
