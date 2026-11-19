package com.seyco.gestion.controller;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.seyco.gestion.dto.SeguimientoDtos.Cobranzas;
import com.seyco.gestion.dto.SeguimientoDtos.Indicadores;
import com.seyco.gestion.dto.SeguimientoDtos.Portafolio;
import com.seyco.gestion.dto.SeguimientoDtos.ResumenCertificacion;
import com.seyco.gestion.entity.Certificacion;
import com.seyco.gestion.entity.CostoReal;
import com.seyco.gestion.entity.EstadoProyecto;
import com.seyco.gestion.entity.Proyecto;
import com.seyco.gestion.entity.TipoCliente;
import com.seyco.gestion.entity.TipoObra;
import com.seyco.gestion.service.CertificacionService;
import com.seyco.gestion.service.CobranzaService;
import com.seyco.gestion.service.CostoRealService;
import com.seyco.gestion.service.ExportacionExcelService;
import com.seyco.gestion.service.IndicadoresService;
import com.seyco.gestion.service.PortafolioService;
import com.seyco.gestion.service.PortafolioService.Filtros;
import com.seyco.gestion.service.ProyectoService;

// Seguimiento de obra: portafolio, cobranzas, indicadores proyectado vs. real, costos reales y
// certificaciones, y sus descargas en Excel. Usa los permisos del módulo `proyectos`: ver y
// descargar es leer; cargar costos y certificaciones es editar (igual que modificar el proyecto).
@RestController
@RequestMapping("/api")
public class SeguimientoController {

	private final PortafolioService portafolioService;
	private final IndicadoresService indicadoresService;
	private final CostoRealService costoRealService;
	private final CertificacionService certificacionService;
	private final CobranzaService cobranzaService;
	private final ExportacionExcelService excel;
	private final ProyectoService proyectoService;

	public SeguimientoController(PortafolioService portafolioService, IndicadoresService indicadoresService,
			CostoRealService costoRealService, CertificacionService certificacionService, CobranzaService cobranzaService,
			ExportacionExcelService excel, ProyectoService proyectoService) {
		this.portafolioService = portafolioService;
		this.indicadoresService = indicadoresService;
		this.costoRealService = costoRealService;
		this.certificacionService = certificacionService;
		this.cobranzaService = cobranzaService;
		this.excel = excel;
		this.proyectoService = proyectoService;
	}

	@GetMapping("/portafolio")
	@PreAuthorize("hasAuthority('proyectos:leer')")
	// Los filtros de lista se repiten en la URL (?tipoCliente=EPE&tipoCliente=VIALIDAD).
	public Portafolio portafolio(@RequestParam(required = false) List<TipoCliente> tipoCliente,
			@RequestParam(required = false) List<TipoObra> tipoObra, @RequestParam(required = false) Integer anio,
			@RequestParam(required = false) List<EstadoProyecto> estado, @RequestParam(required = false) BigDecimal montoMin,
			@RequestParam(required = false) BigDecimal montoMax,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
		return portafolioService.portafolio(
				new Filtros(tipoCliente, tipoObra, anio, estado, montoMin, montoMax, desde, hasta));
	}

	// Mismo portafolio (con los mismos filtros) en Excel.
	@GetMapping("/portafolio/excel")
	@PreAuthorize("hasAuthority('proyectos:leer')")
	public ResponseEntity<byte[]> portafolioExcel(@RequestParam(required = false) List<TipoCliente> tipoCliente,
			@RequestParam(required = false) List<TipoObra> tipoObra, @RequestParam(required = false) Integer anio,
			@RequestParam(required = false) List<EstadoProyecto> estado, @RequestParam(required = false) BigDecimal montoMin,
			@RequestParam(required = false) BigDecimal montoMax,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
		Portafolio portafolio = portafolio(tipoCliente, tipoObra, anio, estado, montoMin, montoMax, desde, hasta);
		return descarga(excel.portafolio(portafolio), "Portafolio " + LocalDate.now() + ".xlsx");
	}

	// ── Cobranzas (todas las obras) ──

	@GetMapping("/cobranzas")
	@PreAuthorize("hasAuthority('proyectos:leer')")
	public Cobranzas cobranzas() {
		return cobranzaService.cobranzas();
	}

	@GetMapping("/cobranzas/excel")
	@PreAuthorize("hasAuthority('proyectos:leer')")
	public ResponseEntity<byte[]> cobranzasExcel() {
		return descarga(excel.cobranzas(cobranzaService.cobranzas()), "Cobranzas " + LocalDate.now() + ".xlsx");
	}

	private static ResponseEntity<byte[]> descarga(byte[] contenido, String nombre) {
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION,
						ContentDisposition.attachment().filename(nombre, StandardCharsets.UTF_8).build().toString())
				.contentType(MediaType.parseMediaType(ExportacionExcelService.XLSX))
				.body(contenido);
	}

	@GetMapping("/proyectos/{id}/indicadores")
	@PreAuthorize("hasAuthority('proyectos:leer')")
	public Indicadores indicadores(@PathVariable Long id) {
		return indicadoresService.indicadores(id);
	}

	// ── Costos reales ──

	@GetMapping("/proyectos/{proyectoId}/costos")
	@PreAuthorize("hasAuthority('proyectos:leer')")
	public List<CostoReal> listarCostos(@PathVariable Long proyectoId) {
		return costoRealService.listar(proyectoId);
	}

	@PostMapping("/proyectos/{proyectoId}/costos")
	@PreAuthorize("hasAuthority('proyectos:editar')")
	public ResponseEntity<CostoReal> crearCosto(@PathVariable Long proyectoId, @RequestBody CostoReal costo) {
		return ResponseEntity.status(HttpStatus.CREATED).body(costoRealService.crear(proyectoId, costo));
	}

	@PutMapping("/proyectos/{proyectoId}/costos/{id}")
	@PreAuthorize("hasAuthority('proyectos:editar')")
	public CostoReal actualizarCosto(@PathVariable Long proyectoId, @PathVariable Long id, @RequestBody CostoReal costo) {
		return costoRealService.actualizar(proyectoId, id, costo);
	}

	@DeleteMapping("/proyectos/{proyectoId}/costos/{id}")
	@PreAuthorize("hasAuthority('proyectos:editar')")
	public ResponseEntity<Void> eliminarCosto(@PathVariable Long proyectoId, @PathVariable Long id) {
		costoRealService.eliminar(proyectoId, id);
		return ResponseEntity.noContent().build();
	}

	// ── Certificaciones ──

	@GetMapping("/proyectos/{proyectoId}/certificaciones")
	@PreAuthorize("hasAuthority('proyectos:leer')")
	public List<Certificacion> listarCertificaciones(@PathVariable Long proyectoId) {
		return certificacionService.listar(proyectoId);
	}

	@GetMapping("/proyectos/{proyectoId}/certificaciones/resumen")
	@PreAuthorize("hasAuthority('proyectos:leer')")
	public ResumenCertificacion resumenCertificaciones(@PathVariable Long proyectoId) {
		return certificacionService.resumen(proyectoId);
	}

	@GetMapping("/proyectos/{proyectoId}/certificaciones/excel")
	@PreAuthorize("hasAuthority('proyectos:leer')")
	public ResponseEntity<byte[]> certificacionesExcel(@PathVariable Long proyectoId) {
		Proyecto proyecto = proyectoService.buscarPorId(proyectoId);
		byte[] contenido = excel.certificaciones(proyecto, certificacionService.listar(proyectoId),
				certificacionService.resumen(proyectoId));
		return descarga(contenido, "Certificaciones " + proyecto.getNombre() + ".xlsx");
	}

	@PostMapping("/proyectos/{proyectoId}/certificaciones")
	@PreAuthorize("hasAuthority('proyectos:editar')")
	public ResponseEntity<Certificacion> crearCertificacion(@PathVariable Long proyectoId,
			@RequestBody Certificacion certificacion) {
		return ResponseEntity.status(HttpStatus.CREATED).body(certificacionService.crear(proyectoId, certificacion));
	}

	@PutMapping("/proyectos/{proyectoId}/certificaciones/{id}")
	@PreAuthorize("hasAuthority('proyectos:editar')")
	public Certificacion actualizarCertificacion(@PathVariable Long proyectoId, @PathVariable Long id,
			@RequestBody Certificacion certificacion) {
		return certificacionService.actualizar(proyectoId, id, certificacion);
	}

	@PatchMapping("/proyectos/{proyectoId}/certificaciones/{id}/cobro")
	@PreAuthorize("hasAuthority('proyectos:editar')")
	public Certificacion registrarCobro(@PathVariable Long proyectoId, @PathVariable Long id,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
		return certificacionService.registrarCobro(proyectoId, id, fecha);
	}

	@DeleteMapping("/proyectos/{proyectoId}/certificaciones/{id}")
	@PreAuthorize("hasAuthority('proyectos:editar')")
	public ResponseEntity<Void> eliminarCertificacion(@PathVariable Long proyectoId, @PathVariable Long id) {
		certificacionService.eliminar(proyectoId, id);
		return ResponseEntity.noContent().build();
	}
}
