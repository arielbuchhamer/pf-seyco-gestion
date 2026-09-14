package com.seyco.gestion.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;

import com.seyco.gestion.entity.EstadoProyecto;
import com.seyco.gestion.entity.EstadoTarea;
import com.seyco.gestion.entity.HistorialEstadoTarea;
import com.seyco.gestion.entity.Proyecto;
import com.seyco.gestion.entity.Tarea;
import com.seyco.gestion.repository.HistorialEstadoTareaRepository;
import com.seyco.gestion.repository.ProyectoRepository;
import com.seyco.gestion.repository.TareaRepository;

@Service
public class ProyectoService extends BaseService<Proyecto, Long> {

	private final ProyectoRepository proyectoRepository;
	private final TareaRepository tareaRepository;
	private final HistorialEstadoTareaRepository historialEstadoTareaRepository;

	public ProyectoService(ProyectoRepository proyectoRepository, TareaRepository tareaRepository,
			HistorialEstadoTareaRepository historialEstadoTareaRepository) {
		super("El proyecto no existe.");
		this.proyectoRepository = proyectoRepository;
		this.tareaRepository = tareaRepository;
		this.historialEstadoTareaRepository = historialEstadoTareaRepository;
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

		existente.setNombre(cambios.getNombre());
		existente.setDescripcion(cambios.getDescripcion());
		existente.setFechaInicio(cambios.getFechaInicio());
		existente.setFechaFin(cambios.getFechaFin());
		if (cambios.getEstado() != null) {
			existente.setEstado(cambios.getEstado());
		}

		return proyectoRepository.save(existente);
	}

	// Seguimiento: foto del estado actual de las tareas del proyecto (CUU_18/CUU_24).
	public Map<String, Object> progreso(Long proyectoId) {
		Proyecto proyecto = buscarPorId(proyectoId);
		List<Tarea> tareas = tareaRepository.findByProyectoId(proyectoId);

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
		return resultado;
	}

	// Rendimiento: duración real de cada tarea COMPLETADA (suma de todos los tramos
	// EN_PROGRESO -> COMPLETADA de su historial, contemplando reaperturas) contra la duración
	// planificada (fechaInicio/fechaFin). Tareas sin ningún tramo completo, sin fechas
	// planificadas, o que ya no están completadas ahora mismo, se excluyen.
	public Map<String, Object> rendimiento(Long proyectoId) {
		Proyecto proyecto = buscarPorId(proyectoId);
		List<Tarea> tareas = tareaRepository.findByProyectoId(proyectoId);

		List<Map<String, Object>> detalle = new ArrayList<>();
		double sumaDesvioDias = 0;
		int tareasConsideradas = 0;

		for (Tarea tarea : tareas) {
			// Sólo cuentan las que están COMPLETADA ahora mismo — si se reabrió (está
			// PENDIENTE/EN_PROGRESO de nuevo), no tiene un cierre vigente que medir, aunque
			// haya estado completada en el pasado. Mantiene esto consistente con "progreso"
			// (Seguimiento), que también cuenta por el estado actual.
			if (tarea.getEstado() != EstadoTarea.COMPLETADA) {
				continue;
			}

			List<HistorialEstadoTarea> historial =
					historialEstadoTareaRepository.findByTareaIdOrderByFechaHoraAsc(tarea.getId());

			// Suma todos los tramos "pasó a EN_PROGRESO" → "pasó a COMPLETADA" del historial,
			// no sólo el último: si se reabrió una o más veces antes de terminar, cada tramo de
			// trabajo cuenta para la duración real (ej.: 2 días trabajados, se reabre porque
			// faltaba algo, 1 día más → 3 días reales en total, no sólo el último tramo).
			Double diasReales = sumaDiasEnProgreso(historial);

			if (diasReales == null || tarea.getFechaInicio() == null || tarea.getFechaFin() == null) {
				continue;
			}

			long diasPlanificados = ChronoUnit.DAYS.between(tarea.getFechaInicio(), tarea.getFechaFin());
			double desvioDias = diasReales - diasPlanificados;

			Map<String, Object> item = new LinkedHashMap<>();
			item.put("tareaId", tarea.getId());
			item.put("nombre", tarea.getNombre());
			item.put("diasPlanificados", diasPlanificados);
			item.put("diasReales", diasReales);
			item.put("desvioDias", desvioDias);
			detalle.add(item);

			sumaDesvioDias += desvioDias;
			tareasConsideradas++;
		}

		Map<String, Object> resultado = new LinkedHashMap<>();
		resultado.put("proyectoId", proyecto.getId());
		resultado.put("tareasConsideradas", tareasConsideradas);
		resultado.put("desvioPromedioDias", tareasConsideradas == 0 ? 0 : sumaDesvioDias / tareasConsideradas);
		resultado.put("detalle", detalle);
		return resultado;
	}

	// Recorre el historial (ascendente) sumando cada tramo EN_PROGRESO -> COMPLETADA que
	// encuentra. Null si no hubo ningún tramo completo (ej.: pasó directo de PENDIENTE a
	// COMPLETADA sin pasar por EN_PROGRESO en ningún momento) — a diferencia de un resultado
	// de 0 días, que sí es un dato real (un tramo que duró menos de un día).
	private Double sumaDiasEnProgreso(List<HistorialEstadoTarea> historial) {
		long totalSegundos = 0;
		boolean huboTramo = false;
		LocalDateTime inicioTramo = null;

		for (HistorialEstadoTarea h : historial) {
			if (h.getEstadoNuevo() == EstadoTarea.EN_PROGRESO) {
				inicioTramo = h.getFechaHora();
			} else if (h.getEstadoNuevo() == EstadoTarea.COMPLETADA && inicioTramo != null) {
				totalSegundos += Duration.between(inicioTramo, h.getFechaHora()).getSeconds();
				huboTramo = true;
				inicioTramo = null;
			}
		}

		return huboTramo ? totalSegundos / 86400.0 : null;
	}
}
