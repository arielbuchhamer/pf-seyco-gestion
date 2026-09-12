package com.seyco.gestion.service;

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

	// Rendimiento: duración real de cada tarea (según HistorialEstadoTarea: cuándo pasó a
	// EN_PROGRESO y cuándo a COMPLETADA) contra la duración planificada (fechaInicio/fechaFin).
	// Tareas sin ambos datos (nunca pasaron por esos estados, o sin fechas planificadas) se excluyen.
	public Map<String, Object> rendimiento(Long proyectoId) {
		Proyecto proyecto = buscarPorId(proyectoId);
		List<Tarea> tareas = tareaRepository.findByProyectoId(proyectoId);

		List<Map<String, Object>> detalle = new ArrayList<>();
		double sumaDesvioDias = 0;
		int tareasConsideradas = 0;

		for (Tarea tarea : tareas) {
			List<HistorialEstadoTarea> historial =
					historialEstadoTareaRepository.findByTareaIdOrderByFechaHoraAsc(tarea.getId());

			LocalDateTime inicioReal = primeraFechaHacia(historial, EstadoTarea.EN_PROGRESO);
			LocalDateTime finReal = primeraFechaHacia(historial, EstadoTarea.COMPLETADA);

			if (inicioReal == null || finReal == null || tarea.getFechaInicio() == null || tarea.getFechaFin() == null) {
				continue;
			}

			long diasPlanificados = ChronoUnit.DAYS.between(tarea.getFechaInicio(), tarea.getFechaFin());
			double diasReales = ChronoUnit.HOURS.between(inicioReal, finReal) / 24.0;
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

	private LocalDateTime primeraFechaHacia(List<HistorialEstadoTarea> historial, EstadoTarea estado) {
		return historial.stream()
				.filter(h -> h.getEstadoNuevo() == estado)
				.map(HistorialEstadoTarea::getFechaHora)
				.findFirst()
				.orElse(null);
	}
}
