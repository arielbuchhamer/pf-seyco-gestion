package com.seyco.gestion.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;

import com.seyco.gestion.entity.EstadoTarea;
import com.seyco.gestion.entity.HistorialEstadoTarea;
import com.seyco.gestion.entity.Proyecto;
import com.seyco.gestion.entity.Tarea;
import com.seyco.gestion.entity.Usuario;
import com.seyco.gestion.repository.HistorialEstadoTareaRepository;
import com.seyco.gestion.repository.ProyectoRepository;
import com.seyco.gestion.repository.TareaRepository;
import com.seyco.gestion.repository.UsuarioRepository;

@Service
public class TareaService extends BaseService<Tarea, Long> {

	private final TareaRepository tareaRepository;
	private final ProyectoRepository proyectoRepository;
	private final UsuarioRepository usuarioRepository;
	private final HistorialEstadoTareaRepository historialEstadoTareaRepository;
	private final ProyectoService proyectoService;

	public TareaService(TareaRepository tareaRepository, ProyectoRepository proyectoRepository,
			UsuarioRepository usuarioRepository, HistorialEstadoTareaRepository historialEstadoTareaRepository,
			ProyectoService proyectoService) {
		super("La tarea no existe.");
		this.tareaRepository = tareaRepository;
		this.proyectoRepository = proyectoRepository;
		this.usuarioRepository = usuarioRepository;
		this.historialEstadoTareaRepository = historialEstadoTareaRepository;
		this.proyectoService = proyectoService;
	}

	@Override
	protected JpaRepository<Tarea, Long> getRepository() {
		return tareaRepository;
	}

	public List<Tarea> listar(Long proyectoId) {
		return proyectoId == null ? listar() : tareaRepository.findByProyectoId(proyectoId);
	}

	// El body sólo trae los ids de proyecto/responsable (no hay DTO): acá se resuelven
	// contra la base para no persistir una referencia a una entidad no gestionada por JPA.
	public Tarea crear(Tarea nueva, String emailCreador) {
		if (nueva.getProyecto() == null || nueva.getProyecto().getId() == null) {
			throw ServiceException.datosInvalidos("La tarea debe pertenecer a un proyecto.");
		}
		Proyecto proyecto = proyectoRepository.findById(nueva.getProyecto().getId())
				.orElseThrow(() -> ServiceException.noEncontrado("El proyecto no existe."));
		nueva.setProyecto(proyecto);

		if (nueva.getResponsable() != null && nueva.getResponsable().getId() != null) {
			Usuario responsable = usuarioRepository.findById(nueva.getResponsable().getId())
					.orElseThrow(() -> ServiceException.noEncontrado("El usuario no existe."));
			nueva.setResponsable(responsable);
		} else {
			nueva.setResponsable(null);
		}

		if (nueva.getEstado() == null) {
			nueva.setEstado(EstadoTarea.PENDIENTE);
		}

		Tarea creada = tareaRepository.save(nueva);
		registrarHistorial(creada, null, creada.getEstado(), emailCreador);
		// CUU_7: apenas el proyecto tiene una tarea, deja de estar PLANIFICADO.
		proyectoService.recalcularEstado(proyecto.getId());
		return creada;
	}

	// Edición general (nombre, descripción, fechas, prioridad, responsable). El estado se
	// cambia aparte con cambiarEstado(), porque ese cambio es el que genera historial.
	public Tarea actualizar(Long id, Tarea cambios) {
		Tarea existente = buscarPorId(id);

		if (cambios.getNombre() == null || cambios.getNombre().isBlank()) {
			throw ServiceException.datosInvalidos("El nombre es obligatorio.");
		}

		existente.setNombre(cambios.getNombre());
		existente.setDescripcion(cambios.getDescripcion());
		existente.setFechaInicio(cambios.getFechaInicio());
		existente.setFechaFin(cambios.getFechaFin());
		existente.setPrioridad(cambios.getPrioridad());

		if (cambios.getResponsable() != null && cambios.getResponsable().getId() != null) {
			Usuario responsable = usuarioRepository.findById(cambios.getResponsable().getId())
					.orElseThrow(() -> ServiceException.noEncontrado("El usuario no existe."));
			existente.setResponsable(responsable);
		} else {
			existente.setResponsable(null);
		}

		return tareaRepository.save(existente);
	}

	// Único punto donde cambia el estado de una tarea: además de persistirlo, deja
	// registrado el cambio en HistorialEstadoTarea sin que el usuario haga nada extra
	// (Historia #8: "el historial de cambios de estado se guarda y puede ser consultado").
	public Tarea cambiarEstado(Long id, EstadoTarea nuevoEstado, String emailUsuario) {
		Tarea tarea = buscarPorId(id);
		EstadoTarea anterior = tarea.getEstado();

		tarea.setEstado(nuevoEstado);
		Tarea guardada = tareaRepository.save(tarea);

		registrarHistorial(guardada, anterior, nuevoEstado, emailUsuario);
		// CUU_8: recalcula si el proyecto pasa a FINALIZADO (todas sus tareas completadas)
		// o vuelve a EN_CURSO (si se reabre una tarea de un proyecto ya finalizado).
		proyectoService.recalcularEstado(guardada.getProyecto().getId());
		return guardada;
	}

	// El historial no cae en cascada solo: no hay @OneToMany desde Tarea hacia
	// HistorialEstadoTarea, y ddl-auto=update no agrega ON DELETE CASCADE a una FK ya
	// creada. Sin este borrado manual, eliminar cualquier tarea tira un 500 (toda tarea
	// tiene al menos un registro de historial desde que se crea).
	@Override
	public void eliminar(Long id) {
		Tarea tarea = buscarPorId(id);
		Long proyectoId = tarea.getProyecto().getId();

		historialEstadoTareaRepository.deleteAll(
				historialEstadoTareaRepository.findByTareaIdOrderByFechaHoraAsc(id));
		tareaRepository.delete(tarea);

		// Si era la última tarea pendiente/en progreso, el proyecto puede pasar a FINALIZADO.
		proyectoService.recalcularEstado(proyectoId);
	}

	private void registrarHistorial(Tarea tarea, EstadoTarea anterior, EstadoTarea nuevo, String emailUsuario) {
		HistorialEstadoTarea historial = new HistorialEstadoTarea();
		historial.setTarea(tarea);
		historial.setEstadoAnterior(anterior);
		historial.setEstadoNuevo(nuevo);
		historial.setFechaHora(LocalDateTime.now());
		usuarioRepository.findByEmail(emailUsuario).ifPresent(historial::setUsuario);
		historialEstadoTareaRepository.save(historial);
	}
}
