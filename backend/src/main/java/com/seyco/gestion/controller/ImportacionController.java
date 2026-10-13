package com.seyco.gestion.controller;

import java.nio.charset.StandardCharsets;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.seyco.gestion.dto.ImportacionDtos.DatosImportacion;
import com.seyco.gestion.dto.ImportacionDtos.PresupuestoDetalle;
import com.seyco.gestion.dto.ImportacionDtos.PrevisualizacionImportacion;
import com.seyco.gestion.entity.ArchivoProyecto;
import com.seyco.gestion.entity.Proyecto;
import com.seyco.gestion.service.ImportacionService;
import com.seyco.gestion.service.PlanillaModeloExcel;

// Alta de proyectos desde el Excel de presupuesto (el único alta de proyectos), consulta del
// presupuesto importado y descarga del Excel de origen. Importar pide el mismo permiso que crear un proyecto.
@RestController
@RequestMapping("/api/proyectos")
public class ImportacionController {

	private static final MediaType XLS = MediaType.parseMediaType("application/vnd.ms-excel");

	private final ImportacionService importacionService;
	private final PlanillaModeloExcel planillaModelo;

	public ImportacionController(ImportacionService importacionService, PlanillaModeloExcel planillaModelo) {
		this.importacionService = importacionService;
		this.planillaModelo = planillaModelo;
	}

	// Paso 1: lee el Excel y devuelve lo que se va a crear, sin guardar nada.
	@PostMapping(path = "/importacion/previsualizar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@PreAuthorize("hasAuthority('proyectos:escribir')")
	public PrevisualizacionImportacion previsualizar(@RequestPart("archivo") MultipartFile archivo) {
		return importacionService.previsualizar(archivo);
	}

	// Paso 2: el mismo archivo + los datos del proyecto confirmados por el usuario (parte "datos", JSON).
	@PostMapping(path = "/importacion", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@PreAuthorize("hasAuthority('proyectos:escribir')")
	public ResponseEntity<Proyecto> importar(@RequestPart("archivo") MultipartFile archivo,
			@RequestPart("datos") DatosImportacion datos, Authentication authentication) {
		Proyecto creado = importacionService.importar(archivo, datos, authentication.getName());
		return ResponseEntity.status(HttpStatus.CREATED).body(creado);
	}

	@GetMapping("/importacion/plantilla")
	@PreAuthorize("hasAuthority('proyectos:escribir')")
	public ResponseEntity<byte[]> plantilla() {
		return descarga(planillaModelo.generar(), PlanillaModeloExcel.NOMBRE_ARCHIVO, XLS);
	}

	@GetMapping("/{id}/presupuesto")
	@PreAuthorize("hasAuthority('proyectos:leer')")
	public PresupuestoDetalle presupuesto(@PathVariable Long id) {
		return importacionService.presupuesto(id);
	}

	// Excel original del que se importó el proyecto.
	@GetMapping("/{id}/excel")
	@PreAuthorize("hasAuthority('proyectos:leer')")
	public ResponseEntity<byte[]> excelOriginal(@PathVariable Long id) {
		ArchivoProyecto archivo = importacionService.archivoOriginal(id);
		MediaType tipo = archivo.getTipoContenido() == null ? MediaType.APPLICATION_OCTET_STREAM
				: MediaType.parseMediaType(archivo.getTipoContenido());
		String nombre = archivo.getProyecto().getArchivoNombre();
		return descarga(archivo.getContenido(), nombre == null ? "proyecto.xls" : nombre, tipo);
	}

	private static ResponseEntity<byte[]> descarga(byte[] contenido, String nombre, MediaType tipo) {
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION,
						ContentDisposition.attachment().filename(nombre, StandardCharsets.UTF_8).build().toString())
				.contentType(tipo)
				.body(contenido);
	}
}
