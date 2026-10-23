package com.seyco.gestion.service;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.seyco.gestion.dto.ImportacionDtos.DatosImportacion;
import com.seyco.gestion.dto.ImportacionDtos.EncabezadoPresupuesto;
import com.seyco.gestion.dto.ImportacionDtos.NivelVerificacion;
import com.seyco.gestion.dto.ImportacionDtos.NodoPresupuesto;
import com.seyco.gestion.dto.ImportacionDtos.PresupuestoDetalle;
import com.seyco.gestion.dto.ImportacionDtos.PrevisualizacionImportacion;
import com.seyco.gestion.dto.ImportacionDtos.TotalesRubro;
import com.seyco.gestion.dto.ImportacionDtos.Verificacion;
import com.seyco.gestion.entity.ArchivoProyecto;
import com.seyco.gestion.entity.EstadoPresupuesto;
import com.seyco.gestion.entity.ItemPresupuesto;
import com.seyco.gestion.entity.Presupuesto;
import com.seyco.gestion.entity.Proyecto;
import com.seyco.gestion.entity.Tarea;
import com.seyco.gestion.entity.TipoItemPresupuesto;
import com.seyco.gestion.entity.Usuario;
import com.seyco.gestion.repository.ArchivoProyectoRepository;
import com.seyco.gestion.repository.ItemPresupuestoRepository;
import com.seyco.gestion.repository.PresupuestoRepository;
import com.seyco.gestion.repository.ProyectoRepository;
import com.seyco.gestion.repository.UsuarioRepository;
import com.seyco.gestion.service.LectorPresupuestoExcel.Nodo;
import com.seyco.gestion.service.LectorPresupuestoExcel.Resultado;

// Alta de proyectos desde el Excel de presupuesto, en dos pasos:
// 1. previsualizar(): lee el Excel y devuelve el árbol, los totales y las verificaciones, sin guardar nada.
// 2. importar(): vuelve a leer el mismo archivo (no se confía en el árbol que manda el cliente)
//    y crea en una sola transacción el Proyecto (con el Excel original como su origen), sus
//    Tareas (capítulos) y Subtareas (grupos) y el Presupuesto con todos sus renglones.
@Service
public class ImportacionService {

	private final LectorPresupuestoExcel lector;
	private final ProyectoService proyectoService;
	private final TareaService tareaService;
	private final ProyectoRepository proyectoRepository;
	private final PresupuestoRepository presupuestoRepository;
	private final ItemPresupuestoRepository itemPresupuestoRepository;
	private final ArchivoProyectoRepository archivoProyectoRepository;
	private final UsuarioRepository usuarioRepository;

	public ImportacionService(LectorPresupuestoExcel lector, ProyectoService proyectoService,
			TareaService tareaService, ProyectoRepository proyectoRepository,
			PresupuestoRepository presupuestoRepository, ItemPresupuestoRepository itemPresupuestoRepository,
			ArchivoProyectoRepository archivoProyectoRepository, UsuarioRepository usuarioRepository) {
		this.lector = lector;
		this.proyectoService = proyectoService;
		this.tareaService = tareaService;
		this.proyectoRepository = proyectoRepository;
		this.presupuestoRepository = presupuestoRepository;
		this.itemPresupuestoRepository = itemPresupuestoRepository;
		this.archivoProyectoRepository = archivoProyectoRepository;
		this.usuarioRepository = usuarioRepository;
	}

	public PrevisualizacionImportacion previsualizar(MultipartFile archivo) {
		Resultado resultado = leer(archivo);
		EncabezadoPresupuesto encabezado = resultado.encabezado();

		List<Verificacion> verificaciones = new ArrayList<>(resultado.verificaciones());
		// El nombre se puede cambiar en "Datos del proyecto" antes de confirmar, así que acá sólo
		// se avisa; importar() es el que lo rechaza.
		if (encabezado.obra() != null && proyectoRepository.findByNombre(encabezado.obra()).isPresent()) {
			verificaciones.add(new Verificacion(NivelVerificacion.ADVERTENCIA, "Ya existe un proyecto con ese nombre",
					"Cambiá el nombre en los datos del proyecto antes de crearlo."));
		} else {
			verificaciones.add(new Verificacion(NivelVerificacion.OK, "No existe otro proyecto con ese nombre", null));
		}

		return new PrevisualizacionImportacion(archivo.getOriginalFilename(), encabezado,
				(int) resultado.contar(TipoItemPresupuesto.CAPITULO), (int) resultado.contar(TipoItemPresupuesto.GRUPO),
				(int) resultado.contar(TipoItemPresupuesto.ITEM), resultado.filasOmitidas(),
				totales(resultado.capitulos()), verificaciones, !resultado.hayErrores(),
				resultado.capitulos().stream().map(n -> aNodo(n, null)).toList());
	}

	@Transactional
	public Proyecto importar(MultipartFile archivo, DatosImportacion datos, String emailUsuario) {
		Resultado resultado = leer(archivo);
		if (resultado.hayErrores()) {
			Verificacion error = resultado.verificaciones().stream()
					.filter(v -> v.nivel() == NivelVerificacion.ERROR).findFirst().orElseThrow();
			throw ServiceException.datosInvalidos("El Excel tiene errores: " + error.titulo() + ".");
		}

		if (datos == null || datos.nombre() == null || datos.nombre().isBlank()) {
			throw ServiceException.datosInvalidos("El nombre del proyecto es obligatorio.");
		}
		if (datos.fechaInicio() == null) {
			throw ServiceException.datosInvalidos("La fecha de inicio es obligatoria.");
		}
		Integer plazo = resultado.encabezado().plazoDias();
		LocalDate fechaFin = datos.fechaFin() != null ? datos.fechaFin()
				: plazo != null ? datos.fechaInicio().plusDays(plazo) : null;
		if (fechaFin != null && fechaFin.isBefore(datos.fechaInicio())) {
			throw ServiceException.datosInvalidos("La fecha de fin no puede ser anterior a la de inicio.");
		}

		Proyecto proyecto = new Proyecto();
		proyecto.setNombre(datos.nombre().trim());
		proyecto.setCliente(vacioANull(datos.cliente()));
		proyecto.setRefCliente(vacioANull(datos.refCliente()));
		proyecto.setAtencion(vacioANull(datos.atencion()));
		proyecto.setDescripcion(vacioANull(datos.descripcion()));
		proyecto.setTipoCliente(datos.tipoCliente());
		proyecto.setTipoObra(datos.tipoObra());
		proyecto.setFechaInicio(datos.fechaInicio());
		proyecto.setFechaFin(fechaFin);
		proyecto.setArchivoNombre(archivo.getOriginalFilename());
		proyecto.setFechaImportacion(LocalDateTime.now());
		proyecto = proyectoService.crear(proyecto);

		ArchivoProyecto original = new ArchivoProyecto();
		original.setProyecto(proyecto);
		original.setTipoContenido(archivo.getContentType());
		original.setContenido(bytes(archivo));
		archivoProyectoRepository.save(original);

		Presupuesto presupuesto = new Presupuesto();
		presupuesto.setProyecto(proyecto);
		presupuesto.setFecha(resultado.encabezado().fecha());
		presupuesto.setPlazoDias(plazo);
		presupuesto.setEstado(EstadoPresupuesto.ABIERTO);
		presupuesto.setTotal(pesos(totales(resultado.capitulos()).total()));
		presupuesto = presupuestoRepository.save(presupuesto);

		Usuario creador = usuarioRepository.findByEmailIgnoreCaseAndFechaBajaIsNull(emailUsuario).orElse(null);
		int[] orden = { 0 };
		List<Nodo> capitulos = resultado.capitulos();
		for (int i = 0; i < capitulos.size(); i++) {
			guardar(capitulos.get(i), i, null, null, proyecto, presupuesto, creador, orden);
		}

		proyectoService.recalcularEstado(proyecto.getId());
		return proyecto;
	}

	// Capítulos y grupos crean su Tarea/subtarea; todos los nodos se guardan como renglón del
	// presupuesto. `orden` es correlativo en preorden, así el árbol se rearma ordenando por él.
	private void guardar(Nodo nodo, int posicion, ItemPresupuesto padre, Tarea tareaPadre, Proyecto proyecto,
			Presupuesto presupuesto, Usuario creador, int[] orden) {
		Tarea tarea = null;
		if (nodo.getTipo() == TipoItemPresupuesto.CAPITULO || nodo.getTipo() == TipoItemPresupuesto.GRUPO) {
			tarea = new Tarea();
			tarea.setNombre(recortar(nodo.getDescripcion() != null ? nodo.getDescripcion()
					: (nodo.getTipo() == TipoItemPresupuesto.CAPITULO ? "Capítulo " : "Grupo ") + nodo.getNumero(), 150));
			tarea.setNumero(nodo.getNumero());
			tarea.setOrden(posicion);
			tarea.setPadre(tareaPadre);
			tarea.setProyecto(proyecto);
			tarea.setFechaInicio(proyecto.getFechaInicio());
			tarea.setFechaFin(proyecto.getFechaFin());
			tarea = tareaService.crearImportada(tarea, creador);
		}

		ItemPresupuesto item = new ItemPresupuesto();
		item.setPresupuesto(presupuesto);
		item.setPadre(padre);
		item.setTarea(tarea);
		item.setTipo(nodo.getTipo());
		item.setNumero(nodo.getNumero());
		item.setCodigo(recortar(nodo.getCodigo(), 100));
		item.setDescripcion(recortar(nodo.getDescripcion(), 1000));
		item.setCantidad(nodo.getCantidad() == null ? null : nodo.getCantidad().setScale(4, RoundingMode.HALF_UP));
		item.setUnidad(recortar(nodo.getUnidad(), 20));
		item.setManoObra(pesos(nodo.getManoObra()));
		item.setEquipos(pesos(nodo.getEquipos()));
		item.setMateriales(pesos(nodo.getMateriales()));
		item.setTerceros(pesos(nodo.getTerceros()));
		item.setTotal(pesos(nodo.getTotal()));
		item.setOrden(orden[0]++);
		item = itemPresupuestoRepository.save(item);

		List<Nodo> hijos = nodo.getHijos();
		for (int i = 0; i < hijos.size(); i++) {
			guardar(hijos.get(i), i, item, tarea != null ? tarea : tareaPadre, proyecto, presupuesto, creador, orden);
		}
	}

	public PresupuestoDetalle presupuesto(Long proyectoId) {
		proyectoService.buscarPorId(proyectoId);
		Presupuesto presupuesto = buscarPresupuesto(proyectoId);
		List<ItemPresupuesto> items = itemPresupuestoRepository.findByPresupuestoIdOrderByOrdenAsc(presupuesto.getId());

		// Rearma el árbol: como vienen en preorden, el padre siempre aparece antes que sus hijos.
		Map<Long, List<NodoPresupuesto>> hijosPorPadre = new HashMap<>();
		List<NodoPresupuesto> raices = new ArrayList<>();
		for (ItemPresupuesto item : items) {
			List<NodoPresupuesto> hijos = new ArrayList<>();
			hijosPorPadre.put(item.getId(), hijos);
			NodoPresupuesto nodo = new NodoPresupuesto(item.getTipo(), item.getNumero(), item.getCodigo(),
					item.getDescripcion(), item.getCantidad(), item.getUnidad(), item.getManoObra(), item.getEquipos(),
					item.getMateriales(), item.getTerceros(), unitario(item.getTotal(), item.getCantidad()),
					item.getTotal(), item.getTarea() == null ? null : item.getTarea().getId(), hijos);
			if (item.getPadre() == null) {
				raices.add(nodo);
			} else {
				hijosPorPadre.get(item.getPadre().getId()).add(nodo);
			}
		}

		TotalesRubro totales = new TotalesRubro(
				raices.stream().map(NodoPresupuesto::manoObra).reduce(BigDecimal.ZERO, BigDecimal::add),
				raices.stream().map(NodoPresupuesto::equipos).reduce(BigDecimal.ZERO, BigDecimal::add),
				raices.stream().map(NodoPresupuesto::materiales).reduce(BigDecimal.ZERO, BigDecimal::add),
				raices.stream().map(NodoPresupuesto::terceros).reduce(BigDecimal.ZERO, BigDecimal::add),
				presupuesto.getTotal());

		return new PresupuestoDetalle(presupuesto.getId(), presupuesto.getFecha(), presupuesto.getPlazoDias(),
				presupuesto.getEstado(), totales, raices);
	}

	public ArchivoProyecto archivoOriginal(Long proyectoId) {
		return archivoProyectoRepository.findByProyectoId(proyectoId)
				.orElseThrow(() -> ServiceException.noEncontrado("El proyecto no tiene un Excel de origen."));
	}

	private Presupuesto buscarPresupuesto(Long proyectoId) {
		return presupuestoRepository.findByProyectoId(proyectoId)
				.orElseThrow(() -> ServiceException.noEncontrado("El proyecto no tiene presupuesto."));
	}

	private Resultado leer(MultipartFile archivo) {
		if (archivo == null || archivo.isEmpty()) {
			throw ServiceException.datosInvalidos("Elegí un archivo Excel (.xls o .xlsx).");
		}
		try (InputStream entrada = archivo.getInputStream()) {
			return lector.leer(entrada);
		} catch (IOException e) {
			throw ServiceException.datosInvalidos("No se pudo leer el archivo.");
		}
	}

	private static byte[] bytes(MultipartFile archivo) {
		try {
			return archivo.getBytes();
		} catch (IOException e) {
			throw ServiceException.datosInvalidos("No se pudo leer el archivo.");
		}
	}

	private static NodoPresupuesto aNodo(Nodo n, Long tareaId) {
		BigDecimal total = pesos(n.getTotal());
		return new NodoPresupuesto(n.getTipo(), n.getNumero(), n.getCodigo(), n.getDescripcion(), n.getCantidad(),
				n.getUnidad(), pesos(n.getManoObra()), pesos(n.getEquipos()), pesos(n.getMateriales()),
				pesos(n.getTerceros()), unitario(total, n.getCantidad()), total, tareaId,
				n.getHijos().stream().map(h -> aNodo(h, null)).toList());
	}

	private static TotalesRubro totales(List<Nodo> capitulos) {
		BigDecimal mo = BigDecimal.ZERO;
		BigDecimal eq = BigDecimal.ZERO;
		BigDecimal mat = BigDecimal.ZERO;
		BigDecimal ter = BigDecimal.ZERO;
		BigDecimal total = BigDecimal.ZERO;
		for (Nodo c : capitulos) {
			mo = mo.add(c.getManoObra());
			eq = eq.add(c.getEquipos());
			mat = mat.add(c.getMateriales());
			ter = ter.add(c.getTerceros());
			total = total.add(c.getTotal());
		}
		return new TotalesRubro(pesos(mo), pesos(eq), pesos(mat), pesos(ter), pesos(total));
	}

	private static BigDecimal unitario(BigDecimal total, BigDecimal cantidad) {
		if (total == null || cantidad == null || cantidad.signum() == 0) {
			return null;
		}
		return total.divide(cantidad, 2, RoundingMode.HALF_UP);
	}

	private static BigDecimal pesos(BigDecimal valor) {
		return valor == null ? null : valor.setScale(2, RoundingMode.HALF_UP);
	}

	private static String recortar(String texto, int largo) {
		return texto == null || texto.length() <= largo ? texto : texto.substring(0, largo);
	}

	private static String vacioANull(String texto) {
		return texto == null || texto.isBlank() ? null : texto.trim();
	}
}
