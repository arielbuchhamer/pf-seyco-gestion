package com.seyco.gestion.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.seyco.gestion.dto.SeguimientoDtos.Alerta;
import com.seyco.gestion.dto.SeguimientoDtos.AvisoProyecto;
import com.seyco.gestion.dto.SeguimientoDtos.Avisos;
import com.seyco.gestion.dto.SeguimientoDtos.NivelAlerta;
import com.seyco.gestion.dto.SeguimientoDtos.Portafolio;
import com.seyco.gestion.dto.SeguimientoDtos.ResumenProyecto;
import com.seyco.gestion.dto.SeguimientoDtos.TotalesPortafolio;

@ExtendWith(MockitoExtension.class)
class AvisosServiceTest {

	@Mock
	private PortafolioService portafolioService;

	private AvisosService avisosService;

	@BeforeEach
	void preparar() {
		avisosService = new AvisosService(portafolioService);
	}

	private static Alerta alerta(NivelAlerta nivel, String titulo) {
		return new Alerta(nivel, titulo, "Detalle de " + titulo);
	}

	private static ResumenProyecto obra(long id, String nombre, Alerta... alertas) {
		return new ResumenProyecto(id, nombre, null, null, null, null, null, null, BigDecimal.ZERO, BigDecimal.ZERO,
				0, 0, null, null, null, null, List.of(alertas));
	}

	private void portafolioCon(ResumenProyecto... obras) {
		int conCriticas = (int) java.util.Arrays.stream(obras)
				.filter(o -> o.alertas().stream().anyMatch(a -> a.nivel() == NivelAlerta.CRITICA)).count();
		TotalesPortafolio totales = new TotalesPortafolio(obras.length, 0, BigDecimal.ZERO, BigDecimal.ZERO,
				BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, conCriticas, null);
		when(portafolioService.portafolio(any())).thenReturn(
				new Portafolio(totales, List.of(obras), List.of(), List.of()));
	}

	@Test
	void sinObrasDevuelveListaYTotalesVacios() {
		portafolioCon();

		Avisos avisos = avisosService.avisos();

		assertTrue(avisos.avisos().isEmpty());
		assertEquals(0, avisos.totales().criticos());
		assertEquals(0, avisos.totales().advertencias());
		assertEquals(0, avisos.totales().informativos());
		assertEquals(0, avisos.totales().proyectosConCriticos());
	}

	@Test
	void obrasSinAlertasNoGeneranAvisos() {
		portafolioCon(obra(1, "Obra A"), obra(2, "Obra B"));

		assertTrue(avisosService.avisos().avisos().isEmpty());
	}

	@Test
	void juntaLosAvisosDeVariasObrasConSuProyecto() {
		portafolioCon(
				obra(1, "Obra A", alerta(NivelAlerta.CRITICA, "Saldo sin certificar")),
				obra(2, "Obra B", alerta(NivelAlerta.ADVERTENCIA, "Sin anticipo"),
						alerta(NivelAlerta.INFO, "Línea base sin fijar")));

		Avisos avisos = avisosService.avisos();

		assertEquals(3, avisos.avisos().size());
		AvisoProyecto primero = avisos.avisos().get(0);
		assertEquals(1L, primero.proyectoId());
		assertEquals("Obra A", primero.proyectoNombre());
		assertEquals("Saldo sin certificar", primero.titulo());
		assertEquals("Detalle de Saldo sin certificar", primero.detalle());
		assertEquals(1, avisos.totales().criticos());
		assertEquals(1, avisos.totales().advertencias());
		assertEquals(1, avisos.totales().informativos());
		assertEquals(1, avisos.totales().proyectosConCriticos());
	}

	@Test
	void ordenaPorNivelYDentroDeCadaNivelPorNombreDeObra() {
		portafolioCon(
				obra(1, "Zeta", alerta(NivelAlerta.CRITICA, "z-critica"), alerta(NivelAlerta.INFO, "z-info")),
				obra(2, "alfa", alerta(NivelAlerta.ADVERTENCIA, "a-adv"), alerta(NivelAlerta.CRITICA, "a-critica")),
				obra(3, "Beta", alerta(NivelAlerta.INFO, "b-info"), alerta(NivelAlerta.ADVERTENCIA, "b-adv")));

		List<String> titulos = avisosService.avisos().avisos().stream().map(AvisoProyecto::titulo).toList();

		assertEquals(List.of("a-critica", "z-critica", "a-adv", "b-adv", "b-info", "z-info"), titulos);
	}

	@Test
	void proyectosConCriticosCuentaObrasNoAvisos() {
		portafolioCon(obra(1, "Obra A", alerta(NivelAlerta.CRITICA, "uno"), alerta(NivelAlerta.CRITICA, "dos")),
				obra(2, "Obra B", alerta(NivelAlerta.ADVERTENCIA, "tres")));

		Avisos avisos = avisosService.avisos();

		assertEquals(2, avisos.totales().criticos());
		assertEquals(1, avisos.totales().proyectosConCriticos());
	}

	@Test
	void calculaUnaSolaVezSinFiltros() {
		portafolioCon(obra(1, "Obra A", alerta(NivelAlerta.INFO, "uno")));

		avisosService.avisos();

		verify(portafolioService, times(1)).portafolio(any());
	}

	@Test
	void asignaLaSolapaSegunElTituloDelAviso() {
		String[][] casos = {
				{ "Línea base sin fijar", "fechas" },
				{ "Atraso de 9 días", "gantt" },
				{ "Adelanto de 1 día", "gantt" },
				{ "Mano de obra excedido", "costos" },
				{ "Materiales cerca del límite", "costos" },
				{ "Equipos sin cotizar", "costos" },
				{ "Saldo sin certificar", "certificaciones" },
				{ "Sin anticipo", "certificaciones" },
				{ "Sin certificar hace 120 días", "certificaciones" },
				{ "Avance sin certificar", "certificaciones" },
				{ "1 certificación sin cobrar", "certificaciones" },
				{ "3 certificaciones sin cobrar", "certificaciones" },
				{ "Título que no conocemos", "indicadores" } };
		ResumenProyecto[] obras = new ResumenProyecto[casos.length];
		for (int i = 0; i < casos.length; i++) {
			obras[i] = obra(i + 1, "Obra " + i, alerta(NivelAlerta.ADVERTENCIA, casos[i][0]));
		}
		portafolioCon(obras);

		List<AvisoProyecto> avisos = avisosService.avisos().avisos();

		assertEquals(casos.length, avisos.size());
		for (String[] caso : casos) {
			AvisoProyecto aviso = avisos.stream().filter(a -> a.titulo().equals(caso[0])).findFirst().orElseThrow();
			assertEquals(caso[1], aviso.solapa(), caso[0]);
		}
	}

	@Test
	void laSolapaNoAlteraElRestoDeLosCampos() {
		portafolioCon(obra(7, "Obra A", alerta(NivelAlerta.CRITICA, "Saldo sin certificar")));

		AvisoProyecto aviso = avisosService.avisos().avisos().get(0);

		assertEquals(7L, aviso.proyectoId());
		assertEquals("Obra A", aviso.proyectoNombre());
		assertEquals(NivelAlerta.CRITICA, aviso.nivel());
		assertEquals("Detalle de Saldo sin certificar", aviso.detalle());
		assertEquals("certificaciones", aviso.solapa());
	}
}
