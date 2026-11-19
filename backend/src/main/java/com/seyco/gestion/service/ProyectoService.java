package com.seyco.gestion.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.seyco.gestion.entity.EstadoProyecto;
import com.seyco.gestion.entity.EstadoTarea;
import com.seyco.gestion.entity.ItemPresupuesto;
import com.seyco.gestion.entity.Proyecto;
import com.seyco.gestion.entity.Tarea;
import com.seyco.gestion.entity.Usuario;
import com.seyco.gestion.repository.ArchivoProyectoRepository;
import com.seyco.gestion.repository.CertificacionRepository;
import com.seyco.gestion.repository.CostoRealRepository;
import com.seyco.gestion.repository.HistorialEstadoTareaRepository;
import com.seyco.gestion.repository.ItemPresupuestoRepository;
import com.seyco.gestion.repository.PresupuestoRepository;
import com.seyco.gestion.repository.ProyectoRepository;
import com.seyco.gestion.repository.TareaRepository;

@Service
public class ProyectoService extends BaseService<Proyecto, Long> {

	private final ProyectoRepository proyectoRepository;
	private final TareaRepository tareaRepository;
	private final HistorialEstadoTareaRepository historialEstadoTareaRepository;
	private final PresupuestoRepository presupuestoRepository;
	private final ItemPresupuestoRepository itemPresupuestoRepository;
	private final ArchivoProyectoRepository archivoProyectoRepository;
	private final CostoRealRepository costoRealRepository;
	private final CertificacionRepository certificacionRepository;

	public ProyectoService(ProyectoRepository proyectoRepository, TareaRepository tareaRepository,
			HistorialEstadoTareaRepository historialEstadoTareaRepository, PresupuestoRepository presupuestoRepository,
			ItemPresupuestoRepository itemPresupuestoRepository,
			ArchivoProyectoRepository archivoProyectoRepository, CostoRealRepository costoRealRepository,
			CertificacionRepository certificacionRepository) {
		super("El proyecto no existe.");
		this.proyectoRepository = proyectoRepository;
		this.tareaRepository = tareaRepository;
		this.historialEstadoTareaRepository = historialEstadoTareaRepository;
		this.presupuestoRepository = presupuestoRepository;
		this.itemPresupuestoRepository = itemPresupuestoRepository;
		this.archivoProyectoRepository = archivoProyectoRepository;
		this.costoRealRepository = costoRealRepository;
		this.certificacionRepository = certificacionRepository;
	}

	// Borra el proyecto con todo lo que cuelga de él: presupuesto con sus renglones, Excel
	// original, costos reales, certificaciones y tareas con su historial. Sin cascadas en la base (ddl-auto=update), se
	// borra a mano de las hojas hacia arriba: renglones, subtareas y después tareas.
	@Override
	@Transactional
	public void eliminar(Long id) {
		Proyecto proyecto = buscarPorId(id);

		// Los gastos van antes que el presupuesto: pueden apuntar a sus renglones.
		costoRealRepository.deleteAll(costoRealRepository.findByProyectoIdOrderByFechaDescIdDesc(id));
		presupuestoRepository.findByProyectoId(id).ifPresent(presupuesto -> {
			List<ItemPresupuesto> items = itemPresupuestoRepository.findByPresupuestoIdOrderByOrdenAsc(presupuesto.getId());
			itemPresupuestoRepository.deleteAll(items.reversed());
			presupuestoRepository.delete(presupuesto);
		});
		archivoProyectoRepository.findByProyectoId(id).ifPresent(archivoProyectoRepository::delete);
		certificacionRepository.deleteAll(certificacionRepository.findByProyectoIdOrderByNumeroAsc(id));

		List<Tarea> tareas = new ArrayList<>(tareaRepository.findByProyectoId(id));
		tareas.sort(Comparator.comparing((Tarea t) -> t.getPadre() == null));
		for (Tarea tarea : tareas) {
			historialEstadoTareaRepository.deleteAll(
					historialEstadoTareaRepository.findByTareaIdOrderByFechaHoraAsc(tarea.getId()));
			tareaRepository.delete(tarea);
		}

		proyectoRepository.delete(proyecto);
	}

	@Override
	protected JpaRepository<Proyecto, Long> getRepository() {
		return proyectoRepository;
	}

	@Override
	public Proyecto crear(Proyecto nuevo) {
		if (proyectoRepository.findByNombre(nuevo.getNombre()).isPresent()) {
			throw ServiceException.conflicto("Ya existe un proyecto con ese nombre.");
		}
		if (nuevo.getEstado() == null) {
			nuevo.setEstado(EstadoProyecto.PLANIFICADO);
		}
		return super.crear(nuevo);
	}

	// Búsqueda por nombre/estado (CUU_27). Sin filtros, se comporta igual que listar().
	public List<Proyecto> listar(String nombre, EstadoProyecto estado) {
		boolean hayNombre = nombre != null && !nombre.isBlank();
		if (hayNombre && estado != null) {
			return proyectoRepository.findByNombreContainingIgnoreCaseAndEstado(nombre, estado);
		}
		if (hayNombre) {
			return proyectoRepository.findByNombreContainingIgnoreCase(nombre);
		}
		if (estado != null) {
			return proyectoRepository.findByEstado(estado);
		}
		return listar();
	}

	// Ciclo de vida automático del proyecto (según el diagrama de estados: la transición la
	// dispara CUU_8/CUU_7, no una acción manual de "cerrar proyecto"). Se llama desde
	// TareaService después de crear una tarea o cambiar su estado.
	// - Sin tareas: no se toca (queda como esté, típicamente PLANIFICADO).
	// - Con al menos una tarea, todas COMPLETADA: FINALIZADO.
	// - Con al menos una tarea, no todas completadas: EN_CURSO (cubre también reabrir una
	//   tarea de un proyecto FINALIZADO, que lo vuelve a EN_CURSO).
	public void recalcularEstado(Long proyectoId) {
		List<Tarea> tareas = tareaRepository.findByProyectoId(proyectoId);
		if (tareas.isEmpty()) {
			return;
		}

		boolean todasCompletadas = tareas.stream().allMatch(t -> t.getEstado() == EstadoTarea.COMPLETADA);
		EstadoProyecto nuevoEstado = todasCompletadas ? EstadoProyecto.FINALIZADO : EstadoProyecto.EN_CURSO;

		Proyecto proyecto = buscarPorId(proyectoId);
		if (proyecto.getEstado() != nuevoEstado) {
			proyecto.setEstado(nuevoEstado);
			proyectoRepository.save(proyecto);
		}
	}

	public Proyecto actualizar(Long id, Proyecto cambios) {
		Proyecto existente = buscarPorId(id);

		if (cambios.getNombre() == null || cambios.getNombre().isBlank()) {
			throw ServiceException.datosInvalidos("El nombre es obligatorio.");
		}
		proyectoRepository.findByNombre(cambios.getNombre())
				.filter(otro -> !otro.getId().equals(id))
				.ifPresent(otro -> {
					throw ServiceException.conflicto("Ya existe un proyecto con ese nombre.");
				});

		if (existente.getLineaBaseFecha() != null
				&& (!Objects.equals(existente.getFechaInicio(), cambios.getFechaInicio())
						|| !Objects.equals(existente.getFechaFin(), cambios.getFechaFin()))) {
			throw ServiceException.conflicto("La línea base del proyecto está fijada: sus fechas no se pueden cambiar.");
		}

		existente.setNombre(cambios.getNombre());
		existente.setDescripcion(cambios.getDescripcion());
		existente.setCliente(cambios.getCliente());
		existente.setRefCliente(cambios.getRefCliente());
		existente.setAtencion(cambios.getAtencion());
		existente.setTipoCliente(cambios.getTipoCliente());
		existente.setTipoObra(cambios.getTipoObra());
		existente.setFechaInicio(cambios.getFechaInicio());
		existente.setFechaFin(cambios.getFechaFin());
		if (cambios.getEstado() != null) {
			existente.setEstado(cambios.getEstado());
		}

		return proyectoRepository.save(existente);
	}

	// Cierra la planificación: congela las fechas plan de las tareas (y las del proyecto) como
	// línea base, contra la que se mide el desvío de las fechas reales. Pide que toda tarea sin
	// subtareas tenga inicio y fin plan (las que tienen subtareas toman las de ellas).
	public Proyecto fijarLineaBase(Long proyectoId) {
		Proyecto proyecto = buscarPorId(proyectoId);
		if (proyecto.getLineaBaseFecha() != null) {
			throw ServiceException.conflicto("La línea base del proyecto ya está fijada.");
		}
		List<Tarea> tareas = tareaRepository.findByProyectoId(proyectoId);
		if (tareas.isEmpty()) {
			throw ServiceException.datosInvalidos("El proyecto no tiene tareas para planificar.");
		}
		Set<Long> conSubtareas = tareas.stream().map(Tarea::getPadreId).filter(Objects::nonNull)
				.collect(Collectors.toSet());
		long sinFechas = tareas.stream()
				.filter(t -> !conSubtareas.contains(t.getId()))
				.filter(t -> t.getFechaInicio() == null || t.getFechaFin() == null)
				.count();
		if (sinFechas > 0) {
			throw ServiceException.datosInvalidos(sinFechas == 1
					? "Falta cargar el inicio y fin plan de 1 tarea."
					: "Falta cargar el inicio y fin plan de " + sinFechas + " tareas.");
		}
		proyecto.setLineaBaseFecha(LocalDateTime.now());
		return proyectoRepository.save(proyecto);
	}

	// Seguimiento: foto del estado actual de las tareas del proyecto (CUU_18/CUU_24).
	public Map<String, Object> progreso(Long proyectoId) {
		Proyecto proyecto = buscarPorId(proyectoId);
		// Sólo cuentan las tareas sin subtareas: el trabajo real está en las subtareas (grupos
		// del presupuesto importado), y la tarea que las agrupa no se completa por sí sola.
		List<Tarea> todas = tareaRepository.findByProyectoId(proyectoId);
		Set<Long> conSubtareas = todas.stream().map(Tarea::getPadreId).filter(Objects::nonNull)
				.collect(Collectors.toSet());
		List<Tarea> tareas = todas.stream().filter(t -> !conSubtareas.contains(t.getId())).toList();

		Map<EstadoTarea, Long> tareasPorEstado = tareas.stream()
				.collect(Collectors.groupingBy(Tarea::getEstado, Collectors.counting()));

		long total = tareas.size();
		long completadas = tareasPorEstado.getOrDefault(EstadoTarea.COMPLETADA, 0L);
		double porcentajeAvance = total == 0 ? 0 : (completadas * 100.0) / total;

		Map<String, Object> resultado = new LinkedHashMap<>();
		resultado.put("proyectoId", proyecto.getId());
		resultado.put("totalTareas", total);
		resultado.put("tareasPorEstado", tareasPorEstado);
		resultado.put("porcentajeAvance", porcentajeAvance);
		// Equipo del proyecto = responsables de sus tareas, sin repetir (avatares del listado,
		// como en el prototipo). No hay una entidad "miembros del proyecto" aparte.
		resultado.put("responsables", todas.stream()
				.map(Tarea::getResponsable)
				.filter(Objects::nonNull)
				.collect(Collectors.toMap(Usuario::getId, u -> u, (a, b) -> a, LinkedHashMap::new))
				.values());
		return resultado;
	}

}
