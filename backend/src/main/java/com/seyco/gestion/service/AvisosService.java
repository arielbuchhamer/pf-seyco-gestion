package com.seyco.gestion.service;

import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;

import com.seyco.gestion.dto.SeguimientoDtos.AvisoProyecto;
import com.seyco.gestion.dto.SeguimientoDtos.Avisos;
import com.seyco.gestion.dto.SeguimientoDtos.NivelAlerta;
import com.seyco.gestion.dto.SeguimientoDtos.Portafolio;
import com.seyco.gestion.dto.SeguimientoDtos.TotalesAvisos;
import com.seyco.gestion.service.PortafolioService.Filtros;

// Avisos de todas las obras en una sola lista. No tiene reglas propias: toma las alertas que ya
// calcula IndicadoresService (vía el portafolio) y las ordena. Una sola pasada por las obras.
@Service
public class AvisosService {

	private final PortafolioService portafolioService;

	public AvisosService(PortafolioService portafolioService) {
		this.portafolioService = portafolioService;
	}

	public Avisos avisos() {
		Portafolio portafolio = portafolioService.portafolio(new Filtros(null, null, null, null, null, null, null, null));

		List<AvisoProyecto> avisos = portafolio.proyectos().stream()
				.flatMap(p -> p.alertas().stream()
						.map(a -> new AvisoProyecto(p.id(), p.nombre(), a.nivel(), a.titulo(), a.detalle(),
									solapa(a.titulo()), a.fecha())))
				.sorted(Comparator.comparing(AvisoProyecto::nivel, Comparator.reverseOrder())
						.thenComparing(AvisoProyecto::proyectoNombre,
								Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
				.toList();

		TotalesAvisos totales = new TotalesAvisos(contar(avisos, NivelAlerta.CRITICA),
				contar(avisos, NivelAlerta.ADVERTENCIA), contar(avisos, NivelAlerta.INFO),
				portafolio.totales().conAlertasCriticas());
		return new Avisos(totales, avisos);
	}

	// Depende de los títulos que genera IndicadoresService: si cambia alguno, hay que actualizar este mapeo.
	static String solapa(String titulo) {
		if (titulo == null) {
			return "indicadores";
		}
		if (titulo.equals("Línea base sin fijar")) {
			return "fechas";
		}
		if (titulo.startsWith("Atraso de ") || titulo.startsWith("Adelanto de ")) {
			return "gantt";
		}
		if (titulo.endsWith(" excedido") || titulo.endsWith(" cerca del límite") || titulo.endsWith(" sin cotizar")) {
			return "costos";
		}
		if (titulo.equals("Saldo sin certificar") || titulo.equals("Sin anticipo")
				|| titulo.startsWith("Sin certificar hace ") || titulo.equals("Avance sin certificar")
				|| titulo.endsWith(" sin cobrar")) {
			return "certificaciones";
		}
		return "indicadores";
	}

	private static int contar(List<AvisoProyecto> avisos, NivelAlerta nivel) {
		return (int) avisos.stream().filter(a -> a.nivel() == nivel).count();
	}
}
