package com.seyco.gestion.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.PrintSetup;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.RegionUtil;
import org.springframework.stereotype.Component;

// "Planilla modelo de proyecto" que se descarga desde la pantalla Proyectos: el mismo formato
// que el Excel de cómputo y desglose de Seyco, vacío, para cargar una obra nueva e importarla.
// Replica la hoja "Computo y desglose" (encabezado, tabla con sus 3 filas de títulos, fuentes,
// anchos, bordes y fórmulas de totales) con un esqueleto de capítulos/grupos sin datos, y la
// hoja RESUMEN (versión para el cliente, que se arma sola con BUSCARV desde la anterior).
// No incluye el modelo de costos interno de Seyco (hoja PRECIOS OBRA, columnas ocultas de
// horas y coeficientes, vínculos a la lista de materiales y al cotizador): los montos por rubro
// se cargan directamente. Se genera en .xls, como el original.
@Component
public class PlanillaModeloExcel {

	public static final String NOMBRE_ARCHIVO = "Planilla modelo de proyecto.xls";

	static final String HOJA_COMPUTO = "Computo y desglose";
	private static final String HOJA_RESUMEN = "RESUMEN";

	// Columnas de "Computo y desglose": A CODIGO, B Item, C Descripción, D-F datos para el
	// cálculo (x1, x2, x3), G Cant, H Un, I-L rubros, M Unit, N Generales.
	private static final int[] ANCHOS_COMPUTO = { 1568, 2304, 9408, 2432, 2432, 2432, 1888, 960, 3264, 3264, 3264,
			3200, 3328, 3200 };
	private static final int[] ANCHOS_RESUMEN = { 1536, 11104, 1760, 1184, 4000, 4000, 4000, 4288, 4288 };
	private static final int FILAS_ITEM_POR_GRUPO = 8;

	public byte[] generar() {
		try (HSSFWorkbook libro = new HSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
			Estilos e = new Estilos(libro);
			Sheet computo = libro.createSheet(HOJA_COMPUTO);
			Sheet resumen = libro.createSheet(HOJA_RESUMEN);
			int filaTotal = escribirComputo(computo, e);
			escribirResumen(resumen, e, filaTotal);
			libro.getCreationHelper().createFormulaEvaluator().evaluateAll();
			libro.setActiveSheet(0);
			libro.write(salida);
			return salida.toByteArray();
		} catch (IOException ex) {
			throw new IllegalStateException("No se pudo generar la planilla modelo.", ex);
		}
	}

	// ── Hoja "Computo y desglose" ───────────────────────────────────────────────────────
	// Devuelve el número (1-based) de la fila de totales generales.
	private int escribirComputo(Sheet hoja, Estilos e) {
		for (int c = 0; c < ANCHOS_COMPUTO.length; c++) {
			hoja.setColumnWidth(c, ANCHOS_COMPUTO[c]);
		}

		// Encabezado del documento (los valores de la columna C se completan para cada obra).
		etiqueta(hoja, 0, "A:", e);
		valor(hoja, 0, e.valorNegrita);
		texto(fila(hoja, 0), 8, "Rosario,", e.ciudad);
		Cell fecha = fila(hoja, 0).createCell(10);
		fecha.setCellStyle(e.fecha);
		hoja.addMergedRegion(new CellRangeAddress(0, 0, 10, 11));
		etiqueta(hoja, 1, "At:", e);
		valor(hoja, 1, e.valorNegrita);
		etiqueta(hoja, 3, "V/Ref:", e);
		valor(hoja, 3, e.valor);
		etiqueta(hoja, 4, "N/Ref:", e);
		valor(hoja, 4, e.valorNegrita).setCellValue("Presupuesto No: ");
		texto(fila(hoja, 4), 12, "SEYCO S.A.", e.empresa);
		hoja.addMergedRegion(new CellRangeAddress(4, 4, 12, 13));
		etiqueta(hoja, 6, "Obra:", e);
		valor(hoja, 6, e.valor);
		hoja.addMergedRegion(new CellRangeAddress(6, 6, 2, 4));
		etiqueta(hoja, 7, "Tema:", e);
		valor(hoja, 7, e.valorNegrita).setCellValue("Planilla de cómputo y desglose de precios");
		for (int r = 0; r <= 7; r++) {
			fila(hoja, r).setHeightInPoints(r == 4 || r == 6 ? 18f : 15.75f);
		}

		escribirTitulosTabla(hoja, e);

		// Esqueleto: dos capítulos con un grupo cada uno, renglones para ítems, "Varios generales"
		// y la fila de totales generales. Se agregan filas/capítulos copiando las existentes.
		int r = 13;
		int primeraFila = r + 1;
		r = escribirCapitulo(hoja, e, r, 1);
		r = escribirCapitulo(hoja, e, r, 2);
		int ultimaFila = r;
		Row total = filaDatos(hoja, r, 21f);
		for (int c = 0; c <= 13; c++) {
			total.createCell(c).setCellStyle(c >= 8 ? e.totalMonto : e.total);
		}
		total.getCell(0).setCellFormula("CONCATENATE(\"t\",B" + (r + 1) + ")");
		total.getCell(1).setCellValue(" 1 - 2");
		total.getCell(2).setCellValue("Totales generales (sin IVA)");
		total.getCell(6).setCellValue(1);
		total.getCell(7).setCellValue("gl");
		// Como en el original: la suma de la columna cuenta dos veces cada ítem (una en su fila
		// y otra en el subtotal de su grupo), por eso se divide por 2.
		for (int c = 8; c <= 13; c++) {
			String col = columna(c);
			total.getCell(c).setCellFormula(c == 12 ? "IF(G" + (r + 1) + "<>0,N" + (r + 1) + "/G" + (r + 1) + ",0)"
					: "SUM(" + col + primeraFila + ":" + col + ultimaFila + ")/2");
		}

		hoja.createFreezePane(8, 13);
		configurarImpresion(hoja);
		return r + 1;
	}

	private void escribirTitulosTabla(Sheet hoja, Estilos e) {
		Row f1 = fila(hoja, 10);
		Row f2 = fila(hoja, 11);
		Row f3 = fila(hoja, 12);
		f1.setHeightInPoints(16.5f);
		f2.setHeightInPoints(24f);
		f3.setHeightInPoints(14.25f);
		for (Row f : new Row[] { f1, f2, f3 }) {
			for (int c = 0; c <= 13; c++) {
				f.createCell(c).setCellStyle(c == 0 ? e.tituloCodigo : e.titulo);
			}
		}
		f1.getCell(0).setCellValue("CODIGO");
		f1.getCell(1).setCellValue("Item");
		f1.getCell(2).setCellValue("Descripción");
		f1.getCell(3).setCellValue("Datos para el cálculo");
		f1.getCell(6).setCellValue("Cant");
		f1.getCell(7).setCellValue("Un");
		f1.getCell(8).setCellValue("Precios por rubros");
		f1.getCell(12).setCellValue("Precios Totales");
		f2.getCell(8).setCellValue("Mano\nde Obra");
		f2.getCell(9).setCellValue("Equipos\ny Grúas");
		f2.getCell(10).setCellValue("Materiales\nVarios");
		f2.getCell(11).setCellValue("Provisión\nTerceros");
		f2.getCell(12).setCellValue("Unit\n[  $  ]");
		f2.getCell(13).setCellValue("Generales\n[  $  ]");
		f3.getCell(3).setCellValue("x1");
		f3.getCell(4).setCellValue("x2");
		f3.getCell(5).setCellValue("x3");

		CellRangeAddress[] regiones = { new CellRangeAddress(10, 12, 0, 0), new CellRangeAddress(10, 12, 1, 1),
				new CellRangeAddress(10, 12, 2, 2), new CellRangeAddress(10, 11, 3, 5),
				new CellRangeAddress(10, 12, 6, 6), new CellRangeAddress(10, 12, 7, 7),
				new CellRangeAddress(10, 10, 8, 11), new CellRangeAddress(10, 10, 12, 13),
				new CellRangeAddress(11, 12, 8, 8), new CellRangeAddress(11, 12, 9, 9),
				new CellRangeAddress(11, 12, 10, 10), new CellRangeAddress(11, 12, 11, 11),
				new CellRangeAddress(11, 12, 12, 12), new CellRangeAddress(11, 12, 13, 13) };
		for (CellRangeAddress region : regiones) {
			hoja.addMergedRegion(region);
			RegionUtil.setBorderTop(BorderStyle.THIN, region, hoja);
			RegionUtil.setBorderBottom(BorderStyle.THIN, region, hoja);
			RegionUtil.setBorderLeft(BorderStyle.THIN, region, hoja);
			RegionUtil.setBorderRight(BorderStyle.THIN, region, hoja);
		}
	}

	// Capítulo stN (sin montos) + grupo stN,1 (subtotales) + renglones de ítems + "Varios
	// generales y terminaciones". Devuelve la próxima fila libre (0-based).
	private int escribirCapitulo(Sheet hoja, Estilos e, int r, int numero) {
		Row capitulo = filaDatos(hoja, r, 15.75f);
		celdas(capitulo, e.codigoTitulo, e.capitulo, e.capitulo);
		capitulo.getCell(0).setCellFormula(codigo(r + 1));
		capitulo.getCell(1).setCellValue(numero);
		capitulo.getCell(1).setCellStyle(e.numeroCapitulo);
		r++;

		int filaGrupo = r + 1;
		Row grupo = filaDatos(hoja, r, 15.75f);
		celdas(grupo, e.codigoTitulo, e.grupo, e.grupoMonto);
		grupo.getCell(0).setCellFormula(codigo(filaGrupo));
		grupo.getCell(1).setCellValue(numero + 0.1);
		grupo.getCell(1).setCellStyle(e.numeroGrupo);
		grupo.getCell(6).setCellStyle(e.cantidadGrupo);
		grupo.getCell(7).setCellStyle(e.unidadGrupo);
		r++;

		int primerItem = r + 1;
		for (int i = 0; i <= FILAS_ITEM_POR_GRUPO; i++) {
			Row item = filaDatos(hoja, r, 15.75f);
			celdas(item, e.codigoItem, e.item, e.monto);
			item.getCell(1).setCellFormula("B" + r + "+0.000001");
			item.getCell(1).setCellStyle(e.numeroItem);
			item.getCell(6).setCellStyle(e.cantidad);
			item.getCell(7).setCellStyle(e.unidad);
			if (i == FILAS_ITEM_POR_GRUPO) {
				item.getCell(2).setCellValue("Varios generales y terminaciones");
				item.getCell(7).setCellValue("glb");
			}
			int n = r + 1;
			item.getCell(12).setCellFormula("IF(G" + n + "<>0,N" + n + "/G" + n + ",0)");
			item.getCell(13).setCellFormula("I" + n + "+J" + n + "+K" + n + "+L" + n);
			r++;
		}
		int ultimoItem = r;

		for (int c = 8; c <= 13; c++) {
			String col = columna(c);
			grupo.getCell(c).setCellFormula(c == 12 ? "IF(G" + filaGrupo + "<>0,N" + filaGrupo + "/G" + filaGrupo + ",0)"
					: "SUM(" + col + primerItem + ":" + col + ultimoItem + ")");
		}
		return r;
	}

	// ── Hoja "RESUMEN" ──────────────────────────────────────────────────────────────────
	private void escribirResumen(Sheet hoja, Estilos e, int filaTotal) {
		for (int c = 0; c < ANCHOS_RESUMEN.length; c++) {
			hoja.setColumnWidth(c, ANCHOS_RESUMEN[c]);
		}
		String origen = "'" + HOJA_COMPUTO + "'!";
		String[][] encabezado = { { "Sres:", "C1" }, { "At:", "C2" }, null, { "V/Rf.:", "C4" }, { "N/Rf.:", "C5" },
				null, { "Obra:", "C7" } };
		for (int r = 0; r < encabezado.length; r++) {
			if (encabezado[r] != null) {
				texto(fila(hoja, r), 0, encabezado[r][0], e.etiquetaChica);
				Cell c = fila(hoja, r).createCell(1);
				c.setCellFormula("IF(" + origen + encabezado[r][1] + "=\"\",\"\"," + origen + encabezado[r][1] + ")");
				c.setCellStyle(e.valorResumen);
			}
		}
		texto(fila(hoja, 7), 0, "Tema:", e.etiquetaChica);
		texto(fila(hoja, 7), 1, "Planilla resumen de precios", e.valorResumen);
		texto(fila(hoja, 0), 4, "Rosario,", e.ciudadResumen);
		Cell fecha = fila(hoja, 0).createCell(5);
		fecha.setCellFormula("IF(" + origen + "K1=\"\",\"\"," + origen + "K1)");
		fecha.setCellStyle(e.fechaResumen);
		texto(fila(hoja, 3), 8, "SEYCO S.A.", e.empresaResumen);

		Row f1 = fila(hoja, 9);
		Row f2 = fila(hoja, 10);
		Row f3 = fila(hoja, 11);
		f1.setHeightInPoints(18f);
		for (Row f : new Row[] { f1, f2, f3 }) {
			for (int c = 0; c <= 8; c++) {
				f.createCell(c).setCellStyle(e.tituloResumen);
			}
		}
		f1.getCell(0).setCellValue("It.");
		f1.getCell(1).setCellValue("Descripción");
		f1.getCell(2).setCellValue("Cant");
		f1.getCell(3).setCellValue("Und");
		f1.getCell(4).setCellValue("Precios por rubros");
		f1.getCell(7).setCellValue("Precios");
		f2.getCell(4).setCellValue("MO");
		f2.getCell(5).setCellValue("Equipos");
		f2.getCell(6).setCellValue("Materiales");
		f2.getCell(7).setCellValue("Unit\n[  $  ]");
		f2.getCell(8).setCellValue("Totales\n[  $  ]");
		CellRangeAddress[] regiones = { new CellRangeAddress(9, 11, 0, 0), new CellRangeAddress(9, 11, 1, 1),
				new CellRangeAddress(9, 11, 2, 2), new CellRangeAddress(9, 11, 3, 3),
				new CellRangeAddress(9, 9, 4, 6), new CellRangeAddress(9, 9, 7, 8),
				new CellRangeAddress(10, 11, 4, 4), new CellRangeAddress(10, 11, 5, 5),
				new CellRangeAddress(10, 11, 6, 6), new CellRangeAddress(10, 11, 7, 7),
				new CellRangeAddress(10, 11, 8, 8) };
		for (CellRangeAddress region : regiones) {
			hoja.addMergedRegion(region);
			RegionUtil.setBorderTop(BorderStyle.THIN, region, hoja);
			RegionUtil.setBorderBottom(BorderStyle.THIN, region, hoja);
			RegionUtil.setBorderLeft(BorderStyle.THIN, region, hoja);
			RegionUtil.setBorderRight(BorderStyle.THIN, region, hoja);
		}

		// Un renglón por capítulo y grupo de la hoja principal, buscado por su código.
		String rango = origen + "A:N";
		String[] codigos = { "st1", "st1,1", "st2", "st2,1", "t 1 - 2" };
		int r = 12;
		for (String codigo : codigos) {
			boolean capitulo = codigo.matches("st\\d+");
			boolean total = codigo.startsWith("t");
			Row f = fila(hoja, r);
			f.setHeightInPoints(15f);
			int n = r + 1;
			for (int c = 0; c <= 8; c++) {
				CellStyle estilo = total ? (c <= 1 ? e.totalTextoResumen : e.totalResumen)
						: c == 0 ? e.codigoResumen : c == 1 ? e.descripcionResumen : c <= 3 ? e.cantidadResumen : e.montoResumen;
				f.createCell(c).setCellStyle(estilo);
			}
			f.getCell(0).setCellValue(codigo);
			// &"" para que una celda vacía de la hoja principal se vea vacía y no como 0.
			f.getCell(1).setCellFormula(buscar(n, rango, 3) + "&\"\"");
			if (!capitulo) {
				f.getCell(2).setCellFormula(buscar(n, rango, 7));
				f.getCell(3).setCellFormula(buscar(n, rango, 8) + "&\"\"");
				f.getCell(4).setCellFormula(buscar(n, rango, 9));
				f.getCell(5).setCellFormula(buscar(n, rango, 10));
				f.getCell(6).setCellFormula(buscar(n, rango, 11) + "+" + buscar(n, rango, 12));
				f.getCell(7).setCellFormula("IF(C" + n + "<>0," + buscar(n, rango, 13) + ",0)");
				f.getCell(8).setCellFormula(buscar(n, rango, 14));
			}
			r++;
		}
		int filaTotalResumen = r;

		Row incidencias = fila(hoja, r);
		texto(incidencias, 1, "Incidencias por Rubro (%)", e.etiquetaResumen);
		for (int c = 4; c <= 6; c++) {
			Cell celda = incidencias.createCell(c);
			String col = columna(c);
			celda.setCellFormula("IF($I$" + filaTotalResumen + "=0,0," + col + filaTotalResumen + "/$I$" + filaTotalResumen + ")");
			celda.setCellStyle(e.porcentaje);
		}
		r += 2;

		texto(fila(hoja, r++), 0, "Notas Técnicas:", e.tituloNotas);
		for (int i = 1; i <= 3; i++) {
			r = nota(hoja, e, r, i + ")", "");
		}
		texto(fila(hoja, r++), 0, "Notas Comerciales:", e.tituloNotas);
		String[] comerciales = { "Los precios no incluyen el I.V.A. y están expresados en pesos.",
				"Plazo de ejecución: ___ días.", "Forma de pago: ", "Validez de la oferta: ___ días." };
		for (int i = 0; i < comerciales.length; i++) {
			r = nota(hoja, e, r, (i + 1) + ")", comerciales[i]);
		}

		hoja.createFreezePane(0, 12);
		configurarImpresion(hoja);
	}

	private int nota(Sheet hoja, Estilos e, int r, String numero, String texto) {
		Row f = fila(hoja, r);
		texto(f, 0, numero, e.numeroNota);
		Cell c = f.createCell(1);
		c.setCellValue(texto);
		c.setCellStyle(e.nota);
		hoja.addMergedRegion(new CellRangeAddress(r, r, 1, 8));
		return r + 1;
	}

	// Código "stN" / "stN,M" a partir del número de la columna B, como CONCATENATE("st",B) del
	// original, pero siempre con coma: un Excel en inglés convertiría 1,1 en "st1.1" y la hoja
	// RESUMEN (que busca "st1,1") no lo encontraría.
	private static String codigo(int fila) {
		return "CONCATENATE(\"st\",SUBSTITUTE(B" + fila + "&\"\",\".\",\",\"))";
	}

	private static String buscar(int fila, String rango, int columna) {
		return "VLOOKUP($A" + fila + "," + rango + "," + columna + ",FALSE)";
	}

	// ── Utilidades ──────────────────────────────────────────────────────────────────────
	private static void configurarImpresion(Sheet hoja) {
		PrintSetup impresion = hoja.getPrintSetup();
		impresion.setLandscape(true);
		impresion.setPaperSize(PrintSetup.A4_PAPERSIZE);
		impresion.setFitWidth((short) 1);
		impresion.setFitHeight((short) 0);
		hoja.setAutobreaks(true);
		hoja.setFitToPage(true);
	}

	private static Row fila(Sheet hoja, int r) {
		Row f = hoja.getRow(r);
		return f != null ? f : hoja.createRow(r);
	}

	private static Row filaDatos(Sheet hoja, int r, float alto) {
		Row f = fila(hoja, r);
		f.setHeightInPoints(alto);
		return f;
	}

	// Crea las celdas A..N de una fila de datos: código, textos (B-H) y montos (I-N).
	private static void celdas(Row f, CellStyle codigo, CellStyle textos, CellStyle montos) {
		for (int c = 0; c <= 13; c++) {
			f.createCell(c).setCellStyle(c == 0 ? codigo : c <= 7 ? textos : montos);
		}
	}

	private static void etiqueta(Sheet hoja, int r, String texto, Estilos e) {
		texto(fila(hoja, r), 1, texto, e.etiqueta);
	}

	private static Cell valor(Sheet hoja, int r, CellStyle estilo) {
		Cell c = fila(hoja, r).createCell(2);
		c.setCellStyle(estilo);
		return c;
	}

	private static void texto(Row f, int columna, String texto, CellStyle estilo) {
		Cell c = f.createCell(columna);
		c.setCellValue(texto);
		c.setCellStyle(estilo);
	}

	private static String columna(int indice) {
		return String.valueOf((char) ('A' + indice));
	}

	// Estilos tomados del original: Arial en el encabezado, Arial Narrow en la tabla, bordes
	// finos/hair entre columnas y la fila de totales sombreada en gris.
	private static final class Estilos {
		private static final String CONTABLE = "_ * #,##0.00_ ;_ * \\-#,##0.00_ ;_ * \"-\"??_ ;_ @_ ";

		final CellStyle etiqueta, valor, valorNegrita, ciudad, fecha, empresa;
		final CellStyle titulo, tituloCodigo;
		final CellStyle codigoTitulo, codigoItem, numeroCapitulo, numeroGrupo, numeroItem;
		final CellStyle capitulo, grupo, grupoMonto, cantidadGrupo, unidadGrupo;
		final CellStyle item, monto, cantidad, unidad;
		final CellStyle total, totalMonto;
		final CellStyle etiquetaChica, valorResumen, ciudadResumen, fechaResumen, empresaResumen, tituloResumen;
		final CellStyle codigoResumen, descripcionResumen, cantidadResumen, montoResumen, totalResumen, totalTextoResumen;
		final CellStyle etiquetaResumen, porcentaje, tituloNotas, numeroNota, nota;

		Estilos(Workbook libro) {
			short contable = libro.createDataFormat().getFormat(CONTABLE);
			short numeroItemFmt = libro.createDataFormat().getFormat("0.000000_)");
			short numeroGrupoFmt = libro.createDataFormat().getFormat("0.0_)");
			short numeroCapituloFmt = libro.createDataFormat().getFormat("0_)");
			short cantidadFmt = libro.createDataFormat().getFormat("0.00_)");
			short fechaFmt = libro.createDataFormat().getFormat("dd/mm/yyyy");

			Font arial8 = fuente(libro, "Arial", 8, false);
			Font arial10 = fuente(libro, "Arial", 10, false);
			Font arial10b = fuente(libro, "Arial", 10, true);
			Font arial12 = fuente(libro, "Arial", 12, false);
			Font arial12b = fuente(libro, "Arial", 12, true);
			Font arial14b = fuente(libro, "Arial", 14, true);
			Font narrow8 = fuente(libro, "Arial Narrow", 8, false);
			Font narrow8b = fuente(libro, "Arial Narrow", 8, true);
			Font narrow12 = fuente(libro, "Arial Narrow", 12, false);
			Font narrow12b = fuente(libro, "Arial Narrow", 12, true);
			Font arial9 = fuente(libro, "Arial", 9, false);

			etiqueta = estilo(libro, arial10, HorizontalAlignment.LEFT);
			valor = estilo(libro, arial12, HorizontalAlignment.LEFT);
			valorNegrita = estilo(libro, arial12b, HorizontalAlignment.LEFT);
			ciudad = estilo(libro, arial12, HorizontalAlignment.RIGHT);
			fecha = estilo(libro, arial12, HorizontalAlignment.CENTER);
			fecha.setDataFormat(fechaFmt);
			empresa = estilo(libro, arial14b, HorizontalAlignment.CENTER);

			titulo = estilo(libro, narrow8, HorizontalAlignment.CENTER);
			titulo.setVerticalAlignment(VerticalAlignment.CENTER);
			titulo.setWrapText(true);
			tituloCodigo = estilo(libro, arial8, HorizontalAlignment.CENTER);
			tituloCodigo.setVerticalAlignment(VerticalAlignment.CENTER);

			codigoTitulo = filaTabla(libro, narrow8b, HorizontalAlignment.LEFT);
			codigoItem = filaTabla(libro, arial8, HorizontalAlignment.LEFT);
			codigoItem.setDataFormat(libro.createDataFormat().getFormat("@"));
			numeroCapitulo = filaTabla(libro, narrow12b, HorizontalAlignment.LEFT);
			numeroCapitulo.setDataFormat(numeroCapituloFmt);
			numeroGrupo = filaTabla(libro, narrow12b, HorizontalAlignment.LEFT);
			numeroGrupo.setDataFormat(numeroGrupoFmt);
			numeroItem = filaTabla(libro, narrow12, HorizontalAlignment.LEFT);
			numeroItem.setDataFormat(numeroItemFmt);
			capitulo = filaTabla(libro, narrow12b, HorizontalAlignment.LEFT);
			grupo = filaTabla(libro, narrow12b, HorizontalAlignment.LEFT);
			grupoMonto = filaTabla(libro, narrow12b, HorizontalAlignment.RIGHT);
			grupoMonto.setDataFormat(contable);
			cantidadGrupo = filaTabla(libro, narrow12b, HorizontalAlignment.RIGHT);
			cantidadGrupo.setDataFormat(cantidadFmt);
			unidadGrupo = filaTabla(libro, narrow12b, HorizontalAlignment.CENTER);
			item = filaTabla(libro, narrow12, HorizontalAlignment.LEFT);
			monto = filaTabla(libro, narrow12, HorizontalAlignment.RIGHT);
			monto.setDataFormat(contable);
			cantidad = filaTabla(libro, narrow12, HorizontalAlignment.RIGHT);
			cantidad.setDataFormat(cantidadFmt);
			unidad = filaTabla(libro, narrow12, HorizontalAlignment.CENTER);

			total = filaTotal(libro, narrow12b, HorizontalAlignment.LEFT);
			totalMonto = filaTotal(libro, narrow12b, HorizontalAlignment.RIGHT);
			totalMonto.setDataFormat(contable);

			etiquetaChica = estilo(libro, arial8, HorizontalAlignment.LEFT);
			valorResumen = estilo(libro, arial10b, HorizontalAlignment.LEFT);
			ciudadResumen = estilo(libro, arial10, HorizontalAlignment.RIGHT);
			fechaResumen = estilo(libro, arial10, HorizontalAlignment.LEFT);
			fechaResumen.setDataFormat(fechaFmt);
			empresaResumen = estilo(libro, arial10b, HorizontalAlignment.CENTER);
			tituloResumen = estilo(libro, narrow8b, HorizontalAlignment.CENTER);
			tituloResumen.setVerticalAlignment(VerticalAlignment.CENTER);
			tituloResumen.setWrapText(true);
			codigoResumen = filaTabla(libro, arial9, HorizontalAlignment.CENTER);
			descripcionResumen = filaTabla(libro, arial10, HorizontalAlignment.LEFT);
			descripcionResumen.setWrapText(true);
			cantidadResumen = filaTabla(libro, arial10, HorizontalAlignment.CENTER);
			montoResumen = filaTabla(libro, arial10, HorizontalAlignment.RIGHT);
			montoResumen.setDataFormat(contable);
			totalResumen = filaTotal(libro, arial10b, HorizontalAlignment.RIGHT);
			totalResumen.setDataFormat(contable);
			totalTextoResumen = filaTotal(libro, arial10b, HorizontalAlignment.LEFT);
			etiquetaResumen = estilo(libro, arial10b, HorizontalAlignment.LEFT);
			porcentaje = estilo(libro, arial10b, HorizontalAlignment.RIGHT);
			porcentaje.setDataFormat(libro.createDataFormat().getFormat("0.0%"));
			tituloNotas = estilo(libro, arial10b, HorizontalAlignment.LEFT);
			numeroNota = estilo(libro, arial10, HorizontalAlignment.LEFT);
			nota = estilo(libro, arial10, HorizontalAlignment.LEFT);
		}

		private static Font fuente(Workbook libro, String nombre, int puntos, boolean negrita) {
			Font f = libro.createFont();
			f.setFontName(nombre);
			f.setFontHeightInPoints((short) puntos);
			f.setBold(negrita);
			return f;
		}

		private static CellStyle estilo(Workbook libro, Font fuente, HorizontalAlignment alineacion) {
			CellStyle s = libro.createCellStyle();
			s.setFont(fuente);
			s.setAlignment(alineacion);
			return s;
		}

		// Renglón de la tabla: líneas hair entre columnas, como el original.
		private static CellStyle filaTabla(Workbook libro, Font fuente, HorizontalAlignment alineacion) {
			CellStyle s = estilo(libro, fuente, alineacion);
			s.setBorderLeft(BorderStyle.HAIR);
			s.setBorderRight(BorderStyle.HAIR);
			s.setBorderBottom(BorderStyle.HAIR);
			return s;
		}

		private static CellStyle filaTotal(Workbook libro, Font fuente, HorizontalAlignment alineacion) {
			CellStyle s = estilo(libro, fuente, alineacion);
			s.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
			s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
			s.setBorderTop(BorderStyle.THIN);
			s.setBorderBottom(BorderStyle.THIN);
			s.setBorderLeft(BorderStyle.HAIR);
			s.setBorderRight(BorderStyle.HAIR);
			return s;
		}
	}
}
