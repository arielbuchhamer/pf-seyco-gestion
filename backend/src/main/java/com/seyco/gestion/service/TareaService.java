package com.seyco.gestion.service;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;

import com.seyco.gestion.entity.EstadoTarea;
import com.seyco.gestion.entity.Proyecto;
import com.seyco.gestion.entity.Tarea;
import com.seyco.gestion.entity.Usuario;
import com.seyco.gestion.repository.ProyectoRepository;
import com.seyco.gestion.repository.TareaRepository;
import com.seyco.gestion.repository.UsuarioRepository;

@Service
public class TareaService extends BaseService<Tarea, Long> {

	private final TareaRepository tareaRepository;
	private final ProyectoRepository proyectoRepository;
	private final UsuarioRepository usuarioRepository;

	public TareaService(TareaRepository tareaRepository, ProyectoRepository proyectoRepository,
			UsuarioRepository usuarioRepository) {
		super("La tarea no existe.");
		this.tareaRepository = tareaRepository;
		this.proyectoRepository = proyectoRepository;
		this.usuarioRepository = usuarioRepository;
	}

	@Override
	protected JpaRepository<Tarea, Long> getRepository() {
		return tareaRepository;
	}

	// El body sólo trae los ids de proyecto/responsable (no hay DTO): acá se resuelven
	// contra la base para no persistir una referencia a una entidad no gestionada por JPA.
	@Override
	public Tarea crear(Tarea nueva) {
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

		return super.crear(nueva);
	}
}
