package com.seyco.gestion.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.seyco.gestion.entity.EstadoTarea;
import com.seyco.gestion.entity.HistorialEstadoTarea;
import com.seyco.gestion.entity.ItemPresupuesto;
import com.seyco.gestion.entity.Proyecto;
import com.seyco.gestion.entity.Tarea;
import com.seyco.gestion.entity.Usuario;
import com.seyco.gestion.repository.HistorialEstadoTareaRepository;
import com.seyco.gestion.repository.ItemPresupuestoRepository;
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
	private final PermisoService permisoService;
	private final ItemPresupuestoRepository itemPresupuestoRepository;

	public TareaService(TareaRepository tareaRepository, ProyectoRepository proyectoRepository,
			UsuarioRepository usuarioRepository, HistorialEstadoTareaRepository historialEstadoTareaRepository,
			ProyectoService proyectoService, PermisoService permisoService,
			ItemPresupuestoRepository itemPresupuestoRepository) {
		super("La tarea no existe.");
		this.tareaRepository = tareaRepository;
		this.proyectoRepository = proyectoRepository;
		this.usuarioRepository = usuarioRepository;
		this.historialEstadoTareaRepository = historialEstadoTareaRepository;
		this.proyectoService = proyectoService;
		this.permisoService = permisoService;
		this.itemPresupuestoRepository = itemPresupuestoRepository;
	}

	@Override
	protected JpaRepository<Tarea, Long> getRepository() {
		return tareaRepository;
	}

	public List<Tarea> listar(Long proyectoId) {
		return proyectoId == null ? listar() : tareaRepository.findByProyectoId(proyectoId);
	}

	// Historia #7: "la tarea asignada aparece en la lista de tareas del miembro correspondiente".
	public List<Tarea> listarAsignadas(String emailResponsable) {
		return tareaRepository.findByResponsableEmail(emailResponsable);
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
			Usuario responsable = usuarioRepository.findByIdAndFechaBajaIsNull(nueva.getResponsable().getId())
					.orElseThrow(() -> ServiceException.noEncontrado("El usuario no existe."));
			nueva.setResponsable(responsable);
		} else {
			nueva.setResponsable(null);
		}

		if (nueva.getEstado() == null) {
			nueva.setEstado(EstadoTarea.PENDIENTE);
		}

		Tarea creada = tareaRepository.save(nueva);
		registrarHistorial(creada, null, creada.getEstado(), usuarioRepository.findByEmailIgnoreCaseAndFechaBajaIsNull(emailCreador).orElse(null));
		// CUU_7: apenas el proyecto tiene una tarea, deja de estar PLANIFICADO.
		proyectoService.recalcularEstado(proyecto.getId());
		return creada;
	}

	// Alta de las tareas y subtareas que salen de la importación del Excel (ImportacionService):
	// el proyecto, el padre y las fechas ya vienen resueltos. Registra el historial igual que
	// crear(); el estado del proyecto lo recalcula la importación una sola vez al final.
	public Tarea crearImportada(Tarea nueva, Usuario creador) {
		nueva.setEstado(EstadoTarea.PENDIENTE);
		Tarea creada = tareaRepository.save(nueva);
		registrarHistorial(creada, null, creada.getEstado(), creador);
		return creada;
	}

	// Edición general (nombre, descripción, fechas, prioridad, responsable). El estado se
	// cambia aparte con cambiarEstado(), porque ese cambio es el que genera historial.
	public Tarea actualizar(Long id, Tarea cambios) {
		Tarea existente = buscarPorId(id);

		if (cambios.getNombre() == null || cambios.getNombre().isBlank()) {
			throw ServiceException.datosInvalidos("El nombre es obligatorio.");
		}

		if (existente.getProyecto().getLineaBaseFecha() != null
				&& (!Objects.equals(existente.getFechaInicio(), cambios.getFechaInicio())
						|| !Objects.equals(existente.getFechaFin(), cambios.getFechaFin()))) {
			throw ServiceException.conflicto("La línea base del proyecto está fijada: las fechas plan no se pueden cambiar.");
		}

		existente.setNombre(cambios.getNombre());
		existente.setDescripcion(cambios.getDescripcion());
		existente.setFechaInicio(cambios.getFechaInicio());
		existente.setFechaFin(cambios.getFechaFin());
		existente.setPrioridad(cambios.getPrioridad());

		if (cambios.getResponsable() != null && cambios.getResponsable().getId() != null) {
			Usuario responsable = usuarioRepository.findByIdAndFechaBajaIsNull(cambios.getResponsable().getId())
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
	// Quien puede editar el módulo `tareas` cambia cualquier tarea; el resto, sólo las que tiene
	// asignadas. No alcanza con @PreAuthorize en el controller: depende de la tarea, no sólo de los permisos.
	public Tarea cambiarEstado(Long id, EstadoTarea nuevoEstado, String emailUsuario) {
		Tarea tarea = buscarPorId(id);
		Usuario usuario = usuarioRepository.findByEmailIgnoreCaseAndFechaBajaIsNull(emailUsuario)
				.orElseThrow(ServiceException::credencialesInvalidas);

		boolean esResponsable = tarea.getResponsable() != null
				&& tarea.getResponsable().getId().equals(usuario.getId());
		if (!esResponsable && !permisoService.tienePermiso(usuario.getId(), "tareas", PermisoService.EDITAR)) {
			throw ServiceException.prohibido("Sólo podés cambiar el estado de las tareas que tenés asignadas.");
		}

		EstadoTarea anterior = tarea.getEstado();
		tarea.setEstado(nuevoEstado);
		Tarea guardada = tareaRepository.save(tarea);

		registrarHistorial(guardada, anterior, nuevoEstado, usuario);
		// CUU_8: recalcula si el proyecto pasa a FINALIZADO (todas sus tareas completadas)
		// o vuelve a EN_CURSO (si se reabre una tarea de un proyecto ya finalizado).
		proyectoService.recalcularEstado(guardada.getProyecto().getId());
		return guardada;
	}

	// Carga de fechas de la solapa Tareas: se guardan todas las filas editadas juntas ("Guardar
	// cambios"). Cada elemento trae el id y las cuatro fechas (plan y reales). Antes de fijar la
	// línea base sólo se edita el plan; después, sólo las reales. Las fechas se cargan en las
	// tareas sin subtareas; las de una tarea con subtareas se recalculan a partir de ellas.
	@Transactional
	public List<Tarea> guardarFechas(Long proyectoId, List<Tarea> cambios) {
		Proyecto proyecto = proyectoService.buscarPorId(proyectoId);
		boolean lineaBaseFijada = proyecto.getLineaBaseFecha() != null;
		List<Tarea> tareas = tareaRepository.findByProyectoId(proyectoId);
		Map<Long, Tarea> porId = tareas.stream().collect(Collectors.toMap(Tarea::getId, Function.identity()));
		Set<Long> conSubtareas = tareas.stream().map(Tarea::getPadreId).filter(Objects::nonNull)
				.collect(Collectors.toSet());
		Set<Tarea> padresTocados = new HashSet<>();

		for (Tarea cambio : cambios) {
			Tarea tarea = cambio.getId() == null ? null : porId.get(cambio.getId());
			if (tarea == null) {
				throw ServiceException.datosInvalidos("La tarea no pertenece al proyecto.");
			}
			if (conSubtareas.contains(tarea.getId())) {
				throw ServiceException.datosInvalidos("Las fechas de «" + tarea.getNombre()
						+ "» salen de sus subtareas: cargalas en cada subtarea.");
			}

			if (lineaBaseFijada) {
				if (!Objects.equals(tarea.getFechaInicio(), cambio.getFechaInicio())
						|| !Objects.equals(tarea.getFechaFin(), cambio.getFechaFin())) {
					throw ServiceException.conflicto("La línea base del proyecto está fijada: las fechas plan no se pueden cambiar.");
				}
				validarFechasReales(tarea.getNombre(), cambio.getFechaInicioReal(), cambio.getFechaFinReal());
				tarea.setFechaInicioReal(cambio.getFechaInicioReal());
				tarea.setFechaFinReal(cambio.getFechaFinReal());
			} else {
				if (cambio.getFechaInicioReal() != null || cambio.getFechaFinReal() != null) {
					throw ServiceException.datosInvalidos("Las fechas reales se cargan después de fijar la línea base.");
				}
				validarFechasPlan(proyecto, tarea.getNombre(), cambio.getFechaInicio(), cambio.getFechaFin());
				tarea.setFechaInicio(cambio.getFechaInicio());
				tarea.setFechaFin(cambio.getFechaFin());
			}
			if (tarea.getPadre() != null) {
				padresTocados.add(tarea.getPadre());
			}
		}

		tareaRepository.saveAll(porId.values());
		padresTocados.forEach(this::consolidarFechas);
		return tareaRepository.findByProyectoId(proyectoId);
	}

	private void validarFechasPlan(Proyecto proyecto, String tarea, LocalDate inicio, LocalDate fin) {
		if (inicio != null && fin != null && fin.isBefore(inicio)) {
			throw ServiceException.datosInvalidos("«" + tarea + "»: el fin plan no puede ser anterior al inicio.");
		}
		LocalDate desde = proyecto.getFechaInicio();
		LocalDate hasta = proyecto.getFechaFin();
		if ((desde != null && ((inicio != null && inicio.isBefore(desde)) || (fin != null && fin.isBefore(desde))))
				|| (hasta != null && ((inicio != null && inicio.isAfter(hasta)) || (fin != null && fin.isAfter(hasta))))) {
			throw ServiceException.datosInvalidos("«" + tarea + "»: las fechas plan tienen que estar dentro del plazo del proyecto.");
		}
	}

	// El fin real puede ser futuro (es la estimación mientras la tarea sigue abierta); el inicio
	// real no: si no empezó, todavía no tiene inicio real.
	private void validarFechasReales(String tarea, LocalDate inicio, LocalDate fin) {
		if (inicio != null && inicio.isAfter(LocalDate.now())) {
			throw ServiceException.datosInvalidos("«" + tarea + "»: el inicio real no puede ser una fecha futura.");
		}
		if (inicio != null && fin != null && fin.isBefore(inicio)) {
			throw ServiceException.datosInvalidos("«" + tarea + "»: el fin estimado/real no puede ser anterior al inicio real.");
		}
	}

	// Fechas de una tarea con subtareas = consolidado de las subtareas: plan y inicio real de
	// punta a punta (la primera que empieza y la última que termina). El fin estimado/real es
	// el de la última en terminar, tomando el plan de las que todavía no tienen estimación; si
	// ninguna subtarea tiene fin estimado/real, la tarea tampoco.
	private void consolidarFechas(Tarea padre) {
		List<Tarea> subtareas = tareaRepository.findByPadre_Id(padre.getId());
		padre.setFechaInicio(minimo(subtareas, Tarea::getFechaInicio));
		padre.setFechaFin(maximo(subtareas, Tarea::getFechaFin));
		padre.setFechaInicioReal(minimo(subtareas, Tarea::getFechaInicioReal));
		boolean hayFinReal = subtareas.stream().anyMatch(s -> s.getFechaFinReal() != null);
		padre.setFechaFinReal(hayFinReal
				? maximo(subtareas, s -> s.getFechaFinReal() != null ? s.getFechaFinReal() : s.getFechaFin())
				: null);
		tareaRepository.save(padre);
	}

	private static LocalDate minimo(List<Tarea> tareas, Function<Tarea, LocalDate> fecha) {
		return tareas.stream().map(fecha).filter(Objects::nonNull).min(Comparator.naturalOrder()).orElse(null);
	}

	private static LocalDate maximo(List<Tarea> tareas, Function<Tarea, LocalDate> fecha) {
		return tareas.stream().map(fecha).filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
	}

	// El historial no cae en cascada solo: no hay @OneToMany desde Tarea hacia
	// HistorialEstadoTarea, y ddl-auto=update no agrega ON DELETE CASCADE a una FK ya
	// creada. Sin este borrado manual, eliminar cualquier tarea tira un 500 (toda tarea
	// tiene al menos un registro de historial desde que se crea).
	// Las subtareas se borran junto con la tarea, y los renglones del presupuesto que
	// apuntaban a ella quedan sin tarea (el presupuesto no se toca).
	@Override
	@Transactional
	public void eliminar(Long id) {
		Tarea tarea = buscarPorId(id);
		Long proyectoId = tarea.getProyecto().getId();
		Tarea padre = tarea.getPadre();

		borrarConSubtareas(tarea);
		// Si era una subtarea, las fechas de la tarea que la agrupa dejan de contarla.
		if (padre != null) {
			consolidarFechas(padre);
		}

		// Si era la última tarea pendiente/en progreso, el proyecto puede pasar a FINALIZADO.
		proyectoService.recalcularEstado(proyectoId);
	}

	private void borrarConSubtareas(Tarea tarea) {
		tareaRepository.findByPadre_Id(tarea.getId()).forEach(this::borrarConSubtareas);
		List<ItemPresupuesto> items = itemPresupuestoRepository.findByTareaId(tarea.getId());
		items.forEach(item -> item.setTarea(null));
		itemPresupuestoRepository.saveAll(items);
		historialEstadoTareaRepository.deleteAll(
				historialEstadoTareaRepository.findByTareaIdOrderByFechaHoraAsc(tarea.getId()));
		tareaRepository.delete(tarea);
	}

	private void registrarHistorial(Tarea tarea, EstadoTarea anterior, EstadoTarea nuevo, Usuario usuario) {
		HistorialEstadoTarea historial = new HistorialEstadoTarea();
		historial.setTarea(tarea);
		historial.setEstadoAnterior(anterior);
		historial.setEstadoNuevo(nuevo);
		historial.setFechaHora(LocalDateTime.now());
		historial.setUsuario(usuario);
		historialEstadoTareaRepository.save(historial);
	}
}
