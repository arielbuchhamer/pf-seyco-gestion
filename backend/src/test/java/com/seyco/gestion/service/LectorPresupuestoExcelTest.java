package com.seyco.gestion.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import com.seyco.gestion.dto.ImportacionDtos.NivelVerificacion;
import com.seyco.gestion.entity.TipoItemPresupuesto;
import com.seyco.gestion.service.LectorPresupuestoExcel.Nodo;
import com.seyco.gestion.service.LectorPresupuestoExcel.Resultado;
import com.seyco.gestion.service.ExcelSintetico.Encabezado;
import com.seyco.gestion.service.ExcelSintetico.Fila;

// Todos los Excel de estas pruebas son sintéticos (generados con ExcelSintetico,
// con datos inventados): ningún dato real de presupuestos de Seyco va en los tests.
class LectorPresupuestoExcelTest {

	private final LectorPresupuestoExcel lector = new LectorPresupuestoExcel();
	private final ExcelSintetico plantilla = new ExcelSintetico();
	private final PlanillaModeloExcel planillaModelo = new PlanillaModeloExcel();

	private static final Encabezado ENCABEZADO = new Encabezado("Cliente Prueba", "Compras", "OC 12",
			"Presupuesto No: 9999 R 26", "Obra de prueba", "Tema de prueba", LocalDate.of(2026, 3, 15), 45);

	// Capítulo con un grupo y un armado, capítulo de honorarios con ítems directos (sin grupos),
	// subtítulo en negrita, renglón con cantidad 0 y un ítem sin unidad.
	private static final List<Fila> FILAS = List.of(
			Fila.titulo("st1", "Tablero"),
			Fila.grupo("st1,1", "Montaje de tablero", 1, "u"),
			Fila.subtitulo("Materiales"),
			Fila.item("AAA  001", "Gabinete", 1, "u", 100, 0, 400, 0),
			Fila.item("AAA 002", "Interruptor", 2, "u", 50, 0, 150, 0),
			Fila.item("AAA 003", "No usado", 0, "u", 0, 0, 0, 0),
			Fila.item(null, "Varios generales y terminaciones", 1, "glb", 10, 0, 5, 0),
			Fila.titulo("st2", "Iluminación"),
			Fila.grupo("st2,1", "Columnas", 2, "u"),
			Fila.titulo("st2,11", "Armado columna"),
			Fila.item("COL 1", "Columna", 2, "u", 200, 300, 1000, 0),
			Fila.item("Zanjeo manual m3", "Zanjeo", 1.5, null, 75, 0, 0, 0),
			Fila.grupo("st2,2", "Puesta a tierra", 1, "glb"),
			Fila.item("PAT 1", "Jabalina", 3, "u", 30, 0, 90, 0),
			Fila.total("1 - 2"),
			Fila.grupo("st3", "Honorarios", 1, "glb"),
			Fila.item(null, "Ingeniería", 1, "glb", 0, 0, 0, 1000),
			Fila.total("1 - 3"));

	@Test
	void leeLaJerarquiaYLosTotalesDeUnXlsx() throws IOException {
		Resultado r = lector.leer(new ByteArrayInputStream(generar(new XSSFWorkbook(), FILAS)));
		verificarEstructura(r);
	}

	@Test
	void leeLoMismoDeUnXlsViejo() throws IOException {
		Resultado r = lector.leer(new ByteArrayInputStream(generar(new HSSFWorkbook(), FILAS)));
		verificarEstructura(r);
	}

	private void verificarEstructura(Resultado r) {
		assertFalse(r.hayErrores(), () -> r.verificaciones().toString());
		assertEquals(3, r.contar(TipoItemPresupuesto.CAPITULO));
		assertEquals(3, r.contar(TipoItemPresupuesto.GRUPO));
		assertEquals(1, r.contar(TipoItemPresupuesto.ARMADO));
		assertEquals(7, r.contar(TipoItemPresupuesto.ITEM));
		assertEquals(1, r.filasOmitidas());

		Nodo cap1 = r.capitulos().get(0);
		assertEquals("1", cap1.getNumero());
		assertEquals("Tablero", cap1.getDescripcion());
		Nodo grupo11 = cap1.getHijos().get(0);
		assertEquals("1.1", grupo11.getNumero());
		assertEquals(3, grupo11.getHijos().size());
		assertEquals("AAA 001", grupo11.getHijos().get(0).getCodigo(), "normaliza espacios del código");
		assertNull(grupo11.getHijos().get(2).getCodigo(), "\"Varios generales\" no tiene código");
		assertMonto(715, grupo11.getTotal());

		Nodo grupo21 = r.capitulos().get(1).getHijos().get(0);
		Nodo armado = grupo21.getHijos().get(0);
		assertEquals(TipoItemPresupuesto.ARMADO, armado.getTipo());
		assertEquals("2.1.1", armado.getNumero());
		assertEquals("2.1.1.2", armado.getHijos().get(1).getNumero());
		assertEquals("c/u", armado.getHijos().get(1).getUnidad(), "sin unidad se carga como c/u");
		// Los montos del armado vienen vacíos: se recalculan de sus ítems, sin multiplicar por su cantidad.
		assertMonto(1575, armado.getTotal());
		assertMonto(1575, grupo21.getTotal());

		Nodo honorarios = r.capitulos().get(2);
		assertEquals(TipoItemPresupuesto.ITEM, honorarios.getHijos().get(0).getTipo(), "ítems directos del capítulo");
		assertMonto(1000, honorarios.getTotal());

		assertMonto(715 + 1575 + 120 + 1000, r.totalGeneralExcel());
		assertTrue(r.verificaciones().stream().anyMatch(v -> v.nivel() == NivelVerificacion.ADVERTENCIA
				&& v.titulo().equals("Ítems sin unidad")));

		assertEquals("Obra de prueba", r.encabezado().obra());
		assertEquals("Cliente Prueba", r.encabezado().cliente());
		assertEquals("OC 12", r.encabezado().refCliente());
		assertEquals("Compras", r.encabezado().atencion());
		assertEquals(LocalDate.of(2026, 3, 15), r.encabezado().fecha());
		assertEquals(45, r.encabezado().plazoDias());
	}

	@Test
	void marcaErrorSiLosRubrosNoSumanElTotalDeLaFila() throws IOException {
		List<Fila> filas = List.of(
				Fila.titulo("st1", "Capítulo"),
				Fila.grupo("st1,1", "Grupo", 1, "u"),
				Fila.item("X 1", "Ítem", 1, "u", 100, 0, 50, 0).conTotal(999),
				Fila.total("1 - 1"));
		Resultado r = lector.leer(new ByteArrayInputStream(generar(new XSSFWorkbook(), filas)));

		assertTrue(r.hayErrores());
		assertTrue(r.verificaciones().stream().anyMatch(v -> v.nivel() == NivelVerificacion.ERROR
				&& v.titulo().startsWith("Filas donde los rubros no suman")));
	}

	@Test
	void rechazaUnExcelSinLaTablaDelPresupuesto() throws IOException {
		try (XSSFWorkbook libro = new XSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
			libro.createSheet("Hoja1").createRow(0).createCell(0).setCellValue("Otra cosa");
			libro.write(salida);
			ByteArrayInputStream entrada = new ByteArrayInputStream(salida.toByteArray());
			assertThrows(ServiceException.class, () -> lector.leer(entrada));
		}
	}

	@Test
	void rechazaUnArchivoQueNoEsExcel() {
		ByteArrayInputStream entrada = new ByteArrayInputStream("no soy un excel".getBytes());
		assertThrows(ServiceException.class, () -> lector.leer(entrada));
	}

	@Test
	void laPlanillaModeloVaciaSeLeePeroNoSePuedeImportar() {
		Resultado r = lector.leer(new ByteArrayInputStream(planillaModelo.generar()));
		// La estructura se reconoce (encabezados, capítulos y grupos), pero sin ítems no se importa.
		assertTrue(r.hayErrores());
		assertTrue(r.verificaciones().stream().anyMatch(v -> v.nivel() == NivelVerificacion.ERROR
				&& v.titulo().equals("El Excel no tiene ítems")));
		assertEquals(1, r.verificaciones().stream().filter(v -> v.nivel() == NivelVerificacion.ERROR).count(),
				() -> r.verificaciones().toString());
		assertEquals(2, r.contar(TipoItemPresupuesto.CAPITULO));
		assertEquals(2, r.contar(TipoItemPresupuesto.GRUPO));
		assertEquals(0, r.contar(TipoItemPresupuesto.ITEM));
		assertNull(r.encabezado().plazoDias(), "el plazo queda para completar");
	}

	@Test
	void aceptaElCodigoDeGrupoConPuntoDecimal() throws IOException {
		// En un Excel configurado en inglés, CONCATENATE("st", 1,1) da "st1.1" en vez de "st1,1".
		List<Fila> filas = List.of(
				Fila.titulo("st1", "Capítulo"),
				Fila.grupo("st1.1", "Grupo", 1, "u"),
				Fila.item("X 1", "Ítem", 1, "u", 100, 0, 50, 0),
				Fila.total("1 - 1"));
		Resultado r = lector.leer(new ByteArrayInputStream(generar(new XSSFWorkbook(), filas)));
		assertFalse(r.hayErrores(), () -> r.verificaciones().toString());
		assertEquals("1.1", r.capitulos().get(0).getHijos().get(0).getNumero());
	}

	private byte[] generar(Workbook libro, List<Fila> filas) throws IOException {
		try (libro; ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
			plantilla.escribir(libro, ENCABEZADO, filas);
			libro.write(salida);
			return salida.toByteArray();
		}
	}

	private static void assertMonto(double esperado, BigDecimal actual) {
		assertEquals(0, BigDecimal.valueOf(esperado).compareTo(actual.setScale(2, java.math.RoundingMode.HALF_UP)),
				() -> "esperado " + esperado + " pero fue " + actual);
	}
}
