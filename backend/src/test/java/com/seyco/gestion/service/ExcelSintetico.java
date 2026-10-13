package com.seyco.gestion.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.CellReference;

// Arma Excels de presupuesto sintéticos para los tests (datos inventados, nunca datos reales de
// Seyco): la misma estructura que el Excel de Seyco (encabezado con A:/Obra:/..., tabla con
// CODIGO, Cant, Un, rubros y totales, filas stN / stN,M / stN,MK / ítems / t) con fórmulas.
public class ExcelSintetico {

	static final int FILA_ENCABEZADO_TABLA = 10;
	private static final int PRIMERA_FILA_DATOS = 13;

	// Columnas, igual que en el Excel de Seyco: A CODIGO, B Item, C Descripción, D-F datos para
	// el cálculo, G Cant, H Un, I-L rubros, M Unit, N Generales.
	private static final int COL_CODIGO = 0;
	private static final int COL_ITEM = 1;
	private static final int COL_DESCRIPCION = 2;
	private static final int COL_CANTIDAD = 6;
	private static final int COL_UNIDAD = 7;
	private static final int COL_MANO_OBRA = 8;
	private static final int COL_TERCEROS = 11;
	private static final int COL_UNITARIO = 12;
	private static final int COL_TOTAL = 13;

	public record Encabezado(String cliente, String atencion, String refCliente, String numero, String obra,
			String tema, LocalDate fecha, Integer plazoDias) {
	}

	// Una fila de la tabla. totalFijo != null escribe ese valor en "Generales" en lugar de la
	// fórmula (para probar filas descuadradas).
	public record Fila(String codigo, String descripcion, Double cantidad, String unidad, double manoObra,
			double equipos, double materiales, double terceros, Double totalFijo) {

		public static Fila titulo(String codigo, String descripcion) {
			return new Fila(codigo, descripcion, null, null, 0, 0, 0, 0, null);
		}

		public static Fila grupo(String codigo, String descripcion, double cantidad, String unidad) {
			return new Fila(codigo, descripcion, cantidad, unidad, 0, 0, 0, 0, null);
		}

		public static Fila item(String codigo, String descripcion, double cantidad, String unidad, double manoObra,
				double equipos, double materiales, double terceros) {
			return new Fila(codigo, descripcion, cantidad, unidad, manoObra, equipos, materiales, terceros, null);
		}

		public static Fila subtitulo(String descripcion) {
			return new Fila(null, descripcion, null, null, 0, 0, 0, 0, null);
		}

		public static Fila total(String rango) {
			return new Fila("t " + rango, null, 1.0, "glb", 0, 0, 0, 0, null);
		}

		public Fila conTotal(double total) {
			return new Fila(codigo, descripcion, cantidad, unidad, manoObra, equipos, materiales, terceros, total);
		}
	}

	// Escribe la hoja "Computo y desglose" (y una hoja RESUMEN con el plazo) y deja calculadas
	// las fórmulas, así el archivo trae los valores igual que uno guardado desde Excel.
	public void escribir(Workbook libro, Encabezado encabezado, List<Fila> filas) {
		Estilos estilos = new Estilos(libro);
		Sheet hoja = libro.createSheet("Computo y desglose");
		escribirEncabezado(hoja, estilos, encabezado);
		escribirEncabezadoTabla(hoja, estilos);
		escribirFilas(hoja, estilos, filas);

		Sheet resumen = libro.createSheet("RESUMEN");
		if (encabezado.plazoDias() != null) {
			resumen.createRow(1).createCell(1).setCellValue("Plazo de ejecución: " + encabezado.plazoDias()
					+ " días desde producido el acopio de los materiales.");
		}

		hoja.setColumnWidth(COL_CODIGO, 14 * 256);
		hoja.setColumnWidth(COL_ITEM, 7 * 256);
		hoja.setColumnWidth(COL_DESCRIPCION, 46 * 256);
		for (int c = 3; c <= 5; c++) {
			hoja.setColumnWidth(c, 6 * 256);
		}
		hoja.setColumnWidth(COL_CANTIDAD, 9 * 256);
		hoja.setColumnWidth(COL_UNIDAD, 6 * 256);
		for (int c = COL_MANO_OBRA; c <= COL_TOTAL; c++) {
			hoja.setColumnWidth(c, 15 * 256);
		}
		hoja.createFreezePane(0, PRIMERA_FILA_DATOS);

		libro.getCreationHelper().createFormulaEvaluator().evaluateAll();
	}

	private void escribirEncabezado(Sheet hoja, Estilos estilos, Encabezado e) {
		String[][] etiquetas = { { "A:", e.cliente() }, { "At:", e.atencion() }, null, { "V/Ref:", e.refCliente() },
				{ "N/Ref:", e.numero() }, null, { "Obra:", e.obra() }, { "Tema:", e.tema() } };
		for (int i = 0; i < etiquetas.length; i++) {
			Row fila = hoja.createRow(i);
			if (etiquetas[i] != null) {
				texto(fila, 1, etiquetas[i][0], estilos.negrita);
				texto(fila, 2, etiquetas[i][1], null);
			}
		}
		if (e.fecha() != null) {
			texto(hoja.getRow(0), 8, "Rosario,", null);
			Cell fecha = hoja.getRow(0).createCell(10);
			fecha.setCellValue(e.fecha());
			fecha.setCellStyle(estilos.fecha);
		}
	}

	private void escribirEncabezadoTabla(Sheet hoja, Estilos estilos) {
		Row f1 = hoja.createRow(FILA_ENCABEZADO_TABLA);
		Row f2 = hoja.createRow(FILA_ENCABEZADO_TABLA + 1);
		Row f3 = hoja.createRow(FILA_ENCABEZADO_TABLA + 2);
		for (Row f : List.of(f1, f2, f3)) {
			for (int c = 0; c <= COL_TOTAL; c++) {
				f.createCell(c).setCellStyle(estilos.encabezado);
			}
		}
		f1.getCell(COL_CODIGO).setCellValue("CODIGO");
		f1.getCell(COL_ITEM).setCellValue("Item");
		f1.getCell(COL_DESCRIPCION).setCellValue("Descripción");
		f1.getCell(3).setCellValue("Datos para el cálculo");
		f1.getCell(COL_CANTIDAD).setCellValue("Cant");
		f1.getCell(COL_UNIDAD).setCellValue("Un");
		f1.getCell(COL_MANO_OBRA).setCellValue("Precios por rubros");
		f1.getCell(COL_UNITARIO).setCellValue("Precios Totales");
		f2.getCell(COL_MANO_OBRA).setCellValue("Mano\nde Obra");
		f2.getCell(COL_MANO_OBRA + 1).setCellValue("Equipos\ny Grúas");
		f2.getCell(COL_MANO_OBRA + 2).setCellValue("Materiales\nVarios");
		f2.getCell(COL_TERCEROS).setCellValue("Provisión\nTerceros");
		f2.getCell(COL_UNITARIO).setCellValue("Unit  [ $ ]");
		f2.getCell(COL_TOTAL).setCellValue("Generales  [ $ ]");
		f3.getCell(3).setCellValue("x1");
		f3.getCell(4).setCellValue("x2");
		f3.getCell(5).setCellValue("x3");
		f2.setHeightInPoints(30);

		hoja.addMergedRegion(new CellRangeAddress(FILA_ENCABEZADO_TABLA, FILA_ENCABEZADO_TABLA, 3, 5));
		hoja.addMergedRegion(new CellRangeAddress(FILA_ENCABEZADO_TABLA, FILA_ENCABEZADO_TABLA, COL_MANO_OBRA, COL_TERCEROS));
		hoja.addMergedRegion(new CellRangeAddress(FILA_ENCABEZADO_TABLA, FILA_ENCABEZADO_TABLA, COL_UNITARIO, COL_TOTAL));
	}

	// Mismas reglas de jerarquía que LectorPresupuestoExcel: cada contenedor (capítulo, grupo)
	// suma con fórmula los ítems que tiene debajo; los armados quedan sin montos, como en el
	// Excel de Seyco; las filas "t" suman todos los ítems anteriores.
	private void escribirFilas(Sheet hoja, Estilos estilos, List<Fila> filas) {
		List<Integer> todosLosItems = new ArrayList<>();
		List<Integer> itemsCapitulo = new ArrayList<>();
		List<Integer> itemsGrupo = new ArrayList<>();
		Row filaCapitulo = null;
		Row filaGrupo = null;
		String sufijoGrupo = null;

		int indice = PRIMERA_FILA_DATOS;
		for (Fila datos : filas) {
			Row fila = hoja.createRow(indice++);
			String codigo = datos.codigo() == null ? "" : datos.codigo();
			Matcher capitulo = LectorPresupuestoExcel.CAPITULO.matcher(codigo);
			Matcher grupo = LectorPresupuestoExcel.GRUPO.matcher(codigo);

			if (capitulo.matches()) {
				cerrar(filaGrupo, itemsGrupo, estilos);
				cerrar(filaCapitulo, itemsCapitulo, estilos);
				filaCapitulo = fila;
				filaGrupo = null;
				escribirTexto(fila, datos, capitulo.group(1) + ".0", estilos.negrita);
				escribirCantidad(fila, datos, estilos);
				// Un capítulo con cantidad (ej. honorarios) suma sus ítems directos.
				if (datos.cantidad() == null) {
					filaCapitulo = null;
				}
			} else if (grupo.matches()) {
				boolean esArmado = filaGrupo != null && grupo.group(2).length() > sufijoGrupo.length()
						&& grupo.group(2).startsWith(sufijoGrupo);
				String item = grupo.group(1) + "." + grupo.group(2);
				escribirTexto(fila, datos, item, estilos.negrita);
				escribirCantidad(fila, datos, estilos);
				if (!esArmado) {
					cerrar(filaGrupo, itemsGrupo, estilos);
					filaGrupo = fila;
					sufijoGrupo = grupo.group(2);
				}
			} else if (LectorPresupuestoExcel.FILA_TOTAL.matcher(codigo).matches()) {
				cerrar(filaGrupo, itemsGrupo, estilos);
				cerrar(filaCapitulo, itemsCapitulo, estilos);
				filaGrupo = null;
				filaCapitulo = null;
				escribirTexto(fila, datos, " " + codigo.substring(2), estilos.negrita);
				texto(fila, COL_DESCRIPCION, "Totales", estilos.negrita);
				sumar(fila, todosLosItems, estilos.totalNegrita);
			} else if (datos.cantidad() == null) {
				texto(fila, COL_DESCRIPCION, datos.descripcion(), estilos.negrita);
			} else {
				escribirTexto(fila, datos, null, null);
				escribirCantidad(fila, datos, estilos);
				numero(fila, COL_MANO_OBRA, datos.manoObra(), estilos.moneda);
				numero(fila, COL_MANO_OBRA + 1, datos.equipos(), estilos.moneda);
				numero(fila, COL_MANO_OBRA + 2, datos.materiales(), estilos.moneda);
				numero(fila, COL_TERCEROS, datos.terceros(), estilos.moneda);
				int r = fila.getRowNum() + 1;
				if (datos.totalFijo() != null) {
					numero(fila, COL_TOTAL, datos.totalFijo(), estilos.moneda);
				} else {
					formula(fila, COL_TOTAL, "SUM(I" + r + ":L" + r + ")", estilos.moneda);
				}
				formula(fila, COL_UNITARIO, "IF(G" + r + "=0,0,N" + r + "/G" + r + ")", estilos.moneda);
				todosLosItems.add(fila.getRowNum());
				(filaGrupo != null ? itemsGrupo : itemsCapitulo).add(fila.getRowNum());
			}
		}
		cerrar(filaGrupo, itemsGrupo, estilos);
		cerrar(filaCapitulo, itemsCapitulo, estilos);
	}

	private void cerrar(Row contenedor, List<Integer> items, Estilos estilos) {
		if (contenedor != null) {
			sumar(contenedor, items, estilos.totalNegrita);
			int r = contenedor.getRowNum() + 1;
			formula(contenedor, COL_UNITARIO, "IF(G" + r + "=0,0,N" + r + "/G" + r + ")", estilos.totalNegrita);
		}
		items.clear();
	}

	// Suma con fórmula, columna por columna (I a N), las filas de ítems indicadas.
	private void sumar(Row fila, List<Integer> items, CellStyle estilo) {
		for (int c = COL_MANO_OBRA; c <= COL_TOTAL; c++) {
			if (c == COL_UNITARIO) {
				continue;
			}
			String columna = CellReference.convertNumToColString(c);
			String suma = items.isEmpty() ? "0"
					: String.join("+", items.stream().map(r -> columna + (r + 1)).toList());
			formula(fila, c, suma, estilo);
		}
	}

	private void escribirTexto(Row fila, Fila datos, String item, CellStyle estilo) {
		texto(fila, COL_CODIGO, datos.codigo(), estilo);
		texto(fila, COL_ITEM, item, estilo);
		texto(fila, COL_DESCRIPCION, datos.descripcion(), estilo);
	}

	private void escribirCantidad(Row fila, Fila datos, Estilos estilos) {
		if (datos.cantidad() != null) {
			numero(fila, COL_CANTIDAD, datos.cantidad(), estilos.cantidad);
		}
		texto(fila, COL_UNIDAD, datos.unidad(), null);
	}

	private static void texto(Row fila, int columna, String valor, CellStyle estilo) {
		if (valor == null) {
			return;
		}
		Cell c = fila.createCell(columna);
		c.setCellValue(valor);
		if (estilo != null) {
			c.setCellStyle(estilo);
		}
	}

	private static void numero(Row fila, int columna, double valor, CellStyle estilo) {
		Cell c = fila.createCell(columna);
		c.setCellValue(valor);
		c.setCellStyle(estilo);
	}

	private static void formula(Row fila, int columna, String formula, CellStyle estilo) {
		Cell c = fila.createCell(columna);
		c.setCellFormula(formula);
		if (estilo != null) {
			c.setCellStyle(estilo);
		}
	}

	private static final class Estilos {
		final CellStyle negrita;
		final CellStyle encabezado;
		final CellStyle moneda;
		final CellStyle totalNegrita;
		final CellStyle cantidad;
		final CellStyle fecha;

		Estilos(Workbook libro) {
			Font fuenteNegrita = libro.createFont();
			fuenteNegrita.setBold(true);
			short formatoMoneda = libro.createDataFormat().getFormat("#,##0.00");

			negrita = libro.createCellStyle();
			negrita.setFont(fuenteNegrita);

			encabezado = libro.createCellStyle();
			encabezado.setFont(fuenteNegrita);
			encabezado.setWrapText(true);
			encabezado.setAlignment(HorizontalAlignment.CENTER);
			encabezado.setVerticalAlignment(VerticalAlignment.CENTER);
			encabezado.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
			encabezado.setFillPattern(FillPatternType.SOLID_FOREGROUND);
			encabezado.setBorderBottom(BorderStyle.THIN);

			moneda = libro.createCellStyle();
			moneda.setDataFormat(formatoMoneda);

			totalNegrita = libro.createCellStyle();
			totalNegrita.setDataFormat(formatoMoneda);
			totalNegrita.setFont(fuenteNegrita);
			totalNegrita.setBorderTop(BorderStyle.THIN);

			cantidad = libro.createCellStyle();
			cantidad.setDataFormat(libro.createDataFormat().getFormat("#,##0.##"));

			fecha = libro.createCellStyle();
			fecha.setDataFormat(libro.getCreationHelper().createDataFormat().getFormat("dd/mm/yyyy"));
		}
	}
}
