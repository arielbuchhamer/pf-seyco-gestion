package com.seyco.gestion.service;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Component;

import com.seyco.gestion.dto.ImportacionDtos.EncabezadoPresupuesto;
import com.seyco.gestion.dto.ImportacionDtos.NivelVerificacion;
import com.seyco.gestion.dto.ImportacionDtos.Verificacion;
import com.seyco.gestion.entity.TipoItemPresupuesto;

// Lee el Excel de presupuesto de Seyco (.xls o .xlsx) y arma el árbol capítulo › grupo ›
// armado › ítem, sin persistir nada. Reglas fijas, sin mapeo de columnas por parte del usuario:
// - La hoja y las columnas se buscan por el texto del encabezado ("CODIGO", "Cant", "Mano de
//   Obra", ...), no por posición. Las columnas auxiliares de la derecha se ignoran.
// - La jerarquía sale de la columna CODIGO: stN = capítulo, stN,M = grupo, stN,MK = armado
//   (el sufijo empieza con el del grupo abierto), "t N - M" = fila de total, otro = ítem.
// - Las cantidades de los ítems ya vienen multiplicadas por la del armado/grupo: no se
//   multiplica nada. Los totales de capítulos, grupos y armados se recalculan sumando hijos
//   y se comparan contra lo que dice el Excel.
// - Todas las celdas son fórmulas (muchas con vínculos a otros archivos): se lee el último
//   valor calculado que guarda el archivo, no se evalúa nada.
@Component
public class LectorPresupuestoExcel {

	// Diferencia admitida por redondeo al comparar montos (en pesos).
	static final BigDecimal TOLERANCIA = BigDecimal.ONE;

	static final Pattern CAPITULO = Pattern.compile("^st\\s*(\\d+)$", Pattern.CASE_INSENSITIVE);
	// El código sale de CONCATENATE("st", B): con Excel en español da "st1,1"; en inglés, "st1.1".
	static final Pattern GRUPO = Pattern.compile("^st\\s*(\\d+)\\s*[,.]\\s*(\\d+)$", Pattern.CASE_INSENSITIVE);
	static final Pattern FILA_TOTAL = Pattern.compile("^t\\s*\\d+\\s*-\\s*\\d+$", Pattern.CASE_INSENSITIVE);

	private static final Pattern ETIQUETA = Pattern.compile("^(a|sres|at|v/ref|obra)\\s*:\\s*(.*)$",
			Pattern.CASE_INSENSITIVE);
	private static final Pattern PLAZO_EJECUCION = Pattern.compile("plazo de ejecucion\\s*:?\\s*(\\d+)\\s*dias");
	private static final int MAX_FILAS_ENCABEZADO = 40;
	private static final int MAX_DETALLE = 5;

	enum Columna {
		CODIGO, DESCRIPCION, CANTIDAD, UNIDAD, MANO_OBRA, EQUIPOS, MATERIALES, TERCEROS, GENERALES
	}

	// Nodo mutable del árbol mientras se lee; ImportacionService lo convierte al DTO o a entidades.
	public static final class Nodo {
		private final TipoItemPresupuesto tipo;
		private final int fila;
		private String numero;
		private String codigo;
		private String descripcion;
		private BigDecimal cantidad;
		private String unidad;
		private BigDecimal manoObra = BigDecimal.ZERO;
		private BigDecimal equipos = BigDecimal.ZERO;
		private BigDecimal materiales = BigDecimal.ZERO;
		private BigDecimal terceros = BigDecimal.ZERO;
		private BigDecimal total = BigDecimal.ZERO;
		// Total que dice la fila del Excel (null si la celda está vacía), para validar.
		private BigDecimal totalExcel;
		private final List<Nodo> hijos = new ArrayList<>();

		Nodo(TipoItemPresupuesto tipo, int fila) {
			this.tipo = tipo;
			this.fila = fila;
		}

		public TipoItemPresupuesto getTipo() {
			return tipo;
		}

		public String getNumero() {
			return numero;
		}

		public String getCodigo() {
			return codigo;
		}

		public String getDescripcion() {
			return descripcion;
		}

		public BigDecimal getCantidad() {
			return cantidad;
		}

		public String getUnidad() {
			return unidad;
		}

		public BigDecimal getManoObra() {
			return manoObra;
		}

		public BigDecimal getEquipos() {
			return equipos;
		}

		public BigDecimal getMateriales() {
			return materiales;
		}

		public BigDecimal getTerceros() {
			return terceros;
		}

		public BigDecimal getTotal() {
			return total;
		}

		public List<Nodo> getHijos() {
			return hijos;
		}

		Nodo agregarHijo(Nodo hijo) {
			hijos.add(hijo);
			return hijo;
		}
	}

	public record Resultado(EncabezadoPresupuesto encabezado, List<Nodo> capitulos, int filasOmitidas,
			BigDecimal totalGeneralExcel, List<Verificacion> verificaciones) {

		public boolean hayErrores() {
			return verificaciones.stream().anyMatch(v -> v.nivel() == NivelVerificacion.ERROR);
		}

		public List<Nodo> recorrer() {
			List<Nodo> todos = new ArrayList<>();
			capitulos.forEach(c -> agregar(c, todos));
			return todos;
		}

		private static void agregar(Nodo nodo, List<Nodo> todos) {
			todos.add(nodo);
			nodo.getHijos().forEach(h -> agregar(h, todos));
		}

		public long contar(TipoItemPresupuesto tipo) {
			return recorrer().stream().filter(n -> n.getTipo() == tipo).count();
		}
	}

	public Resultado leer(InputStream archivo) {
		Workbook libro;
		try {
			libro = WorkbookFactory.create(archivo);
		} catch (IOException | RuntimeException e) {
			throw ServiceException.datosInvalidos("El archivo no es un Excel válido (.xls o .xlsx).");
		}
		try (libro) {
			return leer(libro);
		} catch (IOException e) {
			throw ServiceException.datosInvalidos("No se pudo leer el archivo Excel.");
		}
	}

	Resultado leer(Workbook libro) {
		Sheet hoja = null;
		int filaEncabezado = -1;
		for (Sheet candidata : libro) {
			filaEncabezado = buscarFilaEncabezado(candidata);
			if (filaEncabezado >= 0) {
				hoja = candidata;
				break;
			}
		}
		if (hoja == null) {
			throw ServiceException.datosInvalidos(
					"No se encontró la tabla del presupuesto: falta una fila de encabezado con las columnas CODIGO y Cant.");
		}

		Map<Columna, Integer> columnas = buscarColumnas(hoja, filaEncabezado);
		List<String> faltantes = new ArrayList<>();
		for (Columna c : Columna.values()) {
			if (c != Columna.UNIDAD && !columnas.containsKey(c)) {
				faltantes.add(c.name().toLowerCase().replace('_', ' '));
			}
		}
		if (!faltantes.isEmpty()) {
			throw ServiceException.datosInvalidos("Faltan columnas en el encabezado de la tabla: "
					+ String.join(", ", faltantes) + ".");
		}

		Lectura lectura = new Lectura(hoja, columnas);
		lectura.leerFilas(filaEncabezado + 1);
		EncabezadoPresupuesto encabezado = leerEncabezado(libro, hoja, filaEncabezado);
		return lectura.resultado(encabezado);
	}

	// Estado de la lectura de la tabla, fila por fila.
	private final class Lectura {
		private final Sheet hoja;
		private final Map<Columna, Integer> columnas;
		private final List<Nodo> capitulos = new ArrayList<>();
		private final List<Verificacion> errores = new ArrayList<>();
		private final List<Integer> filasDescuadradas = new ArrayList<>();
		private final List<Integer> filasConError = new ArrayList<>();
		private final List<Integer> filasHuerfanas = new ArrayList<>();
		private Nodo capitulo;
		private Nodo grupo;
		private String sufijoGrupo;
		private Nodo armado;
		private BigDecimal totalGeneralExcel;
		private int filasOmitidas;
		private int sinUnidad;
		private int items;

		Lectura(Sheet hoja, Map<Columna, Integer> columnas) {
			this.hoja = hoja;
			this.columnas = columnas;
		}

		void leerFilas(int desde) {
			for (int i = desde; i <= hoja.getLastRowNum(); i++) {
				Row fila = hoja.getRow(i);
				if (fila != null) {
					leerFila(fila);
				}
			}
		}

		private void leerFila(Row fila) {
			String codigo = normalizarEspacios(texto(celda(fila, Columna.CODIGO)));
			Matcher m;

			if ((m = CAPITULO.matcher(codigo)).matches()) {
				capitulo = new Nodo(TipoItemPresupuesto.CAPITULO, fila.getRowNum() + 1);
				capitulo.numero = String.valueOf(Integer.parseInt(m.group(1)));
				completar(capitulo, fila, codigo);
				capitulos.add(capitulo);
				grupo = null;
				armado = null;
				return;
			}

			if ((m = GRUPO.matcher(codigo)).matches()) {
				String sufijo = m.group(2);
				boolean esArmado = grupo != null && capitulo != null
						&& m.group(1).equals(capitulo.numero) && sufijo.length() > sufijoGrupo.length()
						&& sufijo.startsWith(sufijoGrupo);
				if (esArmado) {
					armado = grupo.agregarHijo(new Nodo(TipoItemPresupuesto.ARMADO, fila.getRowNum() + 1));
					armado.numero = grupo.numero + "." + grupo.hijos.size();
					completar(armado, fila, codigo);
				} else if (capitulo != null && m.group(1).equals(capitulo.numero)) {
					grupo = capitulo.agregarHijo(new Nodo(TipoItemPresupuesto.GRUPO, fila.getRowNum() + 1));
					grupo.numero = capitulo.numero + "." + Integer.parseInt(sufijo);
					sufijoGrupo = sufijo;
					completar(grupo, fila, codigo);
					armado = null;
				} else {
					errores.add(new Verificacion(NivelVerificacion.ERROR, "Grupo fuera de su capítulo",
							"Fila " + (fila.getRowNum() + 1) + ": el grupo " + codigo
									+ " no está debajo del capítulo st" + m.group(1) + "."));
				}
				return;
			}

			if (FILA_TOTAL.matcher(codigo).matches()) {
				BigDecimal total = numero(fila, Columna.GENERALES);
				if (total != null) {
					totalGeneralExcel = total;
				}
				capitulo = null;
				grupo = null;
				armado = null;
				return;
			}

			BigDecimal cantidad = numero(fila, Columna.CANTIDAD);
			String descripcion = normalizarEspacios(texto(celda(fila, Columna.DESCRIPCION)));
			if (cantidad == null) {
				// Subtítulos en negrita, filas vacías o separadores: no son renglones del presupuesto.
				return;
			}
			if (cantidad.signum() == 0) {
				if (!codigo.isEmpty() || !descripcion.isEmpty()) {
					filasOmitidas++;
				}
				return;
			}

			Nodo padre = armado != null ? armado : grupo != null ? grupo : capitulo;
			if (padre == null) {
				filasHuerfanas.add(fila.getRowNum() + 1);
				return;
			}
			Nodo item = padre.agregarHijo(new Nodo(TipoItemPresupuesto.ITEM, fila.getRowNum() + 1));
			items++;
			item.numero = padre.numero + "." + padre.hijos.size();
			completar(item, fila, codigo);
			if (item.unidad == null) {
				item.unidad = "c/u";
				sinUnidad++;
			}

			BigDecimal sumaRubros = item.manoObra.add(item.equipos).add(item.materiales).add(item.terceros);
			if (item.totalExcel == null) {
				item.total = sumaRubros;
			} else {
				item.total = item.totalExcel;
				if (difiere(sumaRubros, item.totalExcel)) {
					filasDescuadradas.add(item.fila);
				}
			}
		}

		private void completar(Nodo nodo, Row fila, String codigo) {
			nodo.codigo = codigo.isEmpty() ? null : codigo;
			String descripcion = normalizarEspacios(texto(celda(fila, Columna.DESCRIPCION)));
			nodo.descripcion = descripcion.isEmpty() ? null : descripcion;
			nodo.cantidad = numero(fila, Columna.CANTIDAD);
			String unidad = normalizarEspacios(texto(celda(fila, Columna.UNIDAD)));
			nodo.unidad = unidad.isEmpty() ? null : unidad;
			nodo.manoObra = cero(numero(fila, Columna.MANO_OBRA));
			nodo.equipos = cero(numero(fila, Columna.EQUIPOS));
			nodo.materiales = cero(numero(fila, Columna.MATERIALES));
			nodo.terceros = cero(numero(fila, Columna.TERCEROS));
			nodo.totalExcel = numero(fila, Columna.GENERALES);
		}

		private Cell celda(Row fila, Columna columna) {
			Integer indice = columnas.get(columna);
			return indice == null ? null : fila.getCell(indice);
		}

		private BigDecimal numero(Row fila, Columna columna) {
			Cell c = celda(fila, columna);
			if (c == null) {
				return null;
			}
			CellType tipo = c.getCellType() == CellType.FORMULA ? c.getCachedFormulaResultType() : c.getCellType();
			if (tipo == CellType.ERROR) {
				filasConError.add(fila.getRowNum() + 1);
				return null;
			}
			return tipo == CellType.NUMERIC ? BigDecimal.valueOf(c.getNumericCellValue()) : null;
		}

		Resultado resultado(EncabezadoPresupuesto encabezado) {
			List<Verificacion> verificaciones = new ArrayList<>(errores);
			List<String> subtotalesDescuadrados = new ArrayList<>();
			capitulos.forEach(c -> totalizar(c, subtotalesDescuadrados));

			BigDecimal totalCalculado = capitulos.stream().map(n -> n.total).reduce(BigDecimal.ZERO, BigDecimal::add);

			if (capitulos.isEmpty()) {
				verificaciones.add(new Verificacion(NivelVerificacion.ERROR, "No hay capítulos",
						"No se encontró ninguna fila con código stN (ej. st1) en la columna CODIGO."));
			} else if (items == 0) {
				// Ej. la planilla modelo sin completar: crearía un proyecto con tareas vacías y $ 0.
				verificaciones.add(new Verificacion(NivelVerificacion.ERROR, "El Excel no tiene ítems",
						"Ninguna fila tiene cantidad mayor a 0. Completá las cantidades y los montos y volvé a subirlo."));
			}

			if (totalGeneralExcel == null) {
				verificaciones.add(new Verificacion(NivelVerificacion.ADVERTENCIA, "Total general",
						"No se encontró la fila de totales generales (código \"t ...\"): no se pudo comparar la suma de los ítems."));
			} else if (difiere(totalCalculado, totalGeneralExcel)) {
				verificaciones.add(new Verificacion(NivelVerificacion.ERROR, "La suma de ítems no da el total general",
						"Suma de ítems: " + pesos(totalCalculado) + "; total general del Excel: " + pesos(totalGeneralExcel) + "."));
			} else {
				verificaciones.add(new Verificacion(NivelVerificacion.OK, "La suma de ítems coincide con el total general",
						pesos(totalCalculado)));
			}

			verificaciones.add(subtotalesDescuadrados.isEmpty()
					? new Verificacion(NivelVerificacion.OK, "Cada tarea y subtarea coincide con su subtotal", null)
					: new Verificacion(NivelVerificacion.ERROR, "Subtotales que no coinciden con la suma de sus ítems",
							resumir(subtotalesDescuadrados)));

			verificaciones.add(filasDescuadradas.isEmpty()
					? new Verificacion(NivelVerificacion.OK,
							"Mano de obra + Equipos + Materiales + Terceros = total en cada fila", null)
					: new Verificacion(NivelVerificacion.ERROR, "Filas donde los rubros no suman el total",
							"Filas " + resumir(filasDescuadradas.stream().map(String::valueOf).toList())));

			if (!filasConError.isEmpty()) {
				verificaciones.add(new Verificacion(NivelVerificacion.ERROR, "Celdas con error en el Excel",
						"Filas " + resumir(filasConError.stream().distinct().map(String::valueOf).toList())
								+ " (ej. #REF! o #VALOR!). Corregilas en el Excel y volvé a subirlo."));
			}
			if (!filasHuerfanas.isEmpty()) {
				verificaciones.add(new Verificacion(NivelVerificacion.ERROR, "Ítems fuera de un capítulo",
						"Filas " + resumir(filasHuerfanas.stream().map(String::valueOf).toList())
								+ ": tienen cantidad pero no están debajo de ningún capítulo stN."));
			}
			if (filasOmitidas > 0) {
				verificaciones.add(new Verificacion(NivelVerificacion.OK, "Filas con cantidad 0 omitidas",
						filasOmitidas + (filasOmitidas == 1 ? " renglón de la plantilla sin usar" : " renglones de la plantilla sin usar")));
			}
			if (sinUnidad > 0) {
				verificaciones.add(new Verificacion(NivelVerificacion.ADVERTENCIA, "Ítems sin unidad",
						sinUnidad + (sinUnidad == 1 ? " ítem sin unidad se carga" : " ítems sin unidad se cargan") + " como \"c/u\"."));
			}

			return new Resultado(encabezado, capitulos, filasOmitidas, totalGeneralExcel, verificaciones);
		}

		// Recalcula de abajo hacia arriba los montos de capítulos, grupos y armados y los compara
		// contra la fila del Excel. Los armados suelen venir vacíos o en 0: en ese caso no se compara.
		private void totalizar(Nodo nodo, List<String> descuadrados) {
			if (nodo.tipo == TipoItemPresupuesto.ITEM) {
				return;
			}
			if (nodo.hijos.isEmpty()) {
				nodo.total = nodo.totalExcel == null ? BigDecimal.ZERO : nodo.totalExcel;
				return;
			}
			nodo.hijos.forEach(h -> totalizar(h, descuadrados));
			nodo.manoObra = sumar(nodo.hijos, n -> n.manoObra);
			nodo.equipos = sumar(nodo.hijos, n -> n.equipos);
			nodo.materiales = sumar(nodo.hijos, n -> n.materiales);
			nodo.terceros = sumar(nodo.hijos, n -> n.terceros);
			nodo.total = sumar(nodo.hijos, n -> n.total);

			boolean comparar = nodo.totalExcel != null
					&& (nodo.tipo != TipoItemPresupuesto.ARMADO || nodo.totalExcel.signum() != 0);
			if (comparar && difiere(nodo.total, nodo.totalExcel)) {
				descuadrados.add(nodo.numero + " (" + pesos(nodo.total) + " vs. " + pesos(nodo.totalExcel) + ")");
			}
		}
	}

	private static BigDecimal sumar(List<Nodo> nodos, java.util.function.Function<Nodo, BigDecimal> campo) {
		return nodos.stream().map(campo).reduce(BigDecimal.ZERO, BigDecimal::add);
	}

	private static boolean difiere(BigDecimal a, BigDecimal b) {
		return a.subtract(b).abs().compareTo(TOLERANCIA) > 0;
	}

	private static BigDecimal cero(BigDecimal valor) {
		return valor == null ? BigDecimal.ZERO : valor;
	}

	private static String pesos(BigDecimal valor) {
		return "$ " + String.format(java.util.Locale.of("es", "AR"), "%,.2f", valor.setScale(2, RoundingMode.HALF_UP));
	}

	private static String resumir(List<String> elementos) {
		String lista = String.join(", ", elementos.subList(0, Math.min(MAX_DETALLE, elementos.size())));
		return elementos.size() > MAX_DETALLE ? lista + " y " + (elementos.size() - MAX_DETALLE) + " más" : lista;
	}

	// Fila de encabezado de la tabla: la primera que tiene "CODIGO" y "Cant".
	private static int buscarFilaEncabezado(Sheet hoja) {
		for (int i = 0; i <= Math.min(hoja.getLastRowNum(), MAX_FILAS_ENCABEZADO); i++) {
			Row fila = hoja.getRow(i);
			if (fila == null) {
				continue;
			}
			boolean codigo = false;
			boolean cantidad = false;
			for (Cell c : fila) {
				String t = normalizar(texto(c));
				codigo |= t.equals("codigo");
				cantidad |= t.equals("cant") || t.equals("cantidad");
			}
			if (codigo && cantidad) {
				return i;
			}
		}
		return -1;
	}

	// El encabezado de la tabla ocupa hasta 3 filas (ej. "Precios por rubros" arriba y
	// "Mano de Obra" abajo). Se toma la primera columna (la más a la izquierda) con cada texto.
	private static Map<Columna, Integer> buscarColumnas(Sheet hoja, int filaEncabezado) {
		Map<Columna, Integer> columnas = new EnumMap<>(Columna.class);
		for (int i = filaEncabezado; i <= filaEncabezado + 2; i++) {
			Row fila = hoja.getRow(i);
			if (fila == null) {
				continue;
			}
			for (Cell c : fila) {
				Columna columna = reconocerColumna(normalizar(texto(c)));
				if (columna != null) {
					columnas.merge(columna, c.getColumnIndex(), Math::min);
				}
			}
		}
		return columnas;
	}

	private static Columna reconocerColumna(String t) {
		if (t.equals("codigo")) {
			return Columna.CODIGO;
		}
		if (t.startsWith("descripcion")) {
			return Columna.DESCRIPCION;
		}
		if (t.equals("cant") || t.equals("cantidad")) {
			return Columna.CANTIDAD;
		}
		if (t.equals("un") || t.equals("unidad")) {
			return Columna.UNIDAD;
		}
		if (t.equals("mano de obra")) {
			return Columna.MANO_OBRA;
		}
		if (t.startsWith("equipos")) {
			return Columna.EQUIPOS;
		}
		if (t.startsWith("materiales")) {
			return Columna.MATERIALES;
		}
		if (t.endsWith("terceros")) {
			return Columna.TERCEROS;
		}
		if (t.equals("generales") || t.equals("total")) {
			return Columna.GENERALES;
		}
		return null;
	}

	// Etiquetas "A:", "At:", "V/Ref:" y "Obra:" arriba de la tabla; el valor está en la
	// misma celda después de los dos puntos o en la próxima celda con texto a la derecha.
	// "N/Ref:" (el n° de presupuesto) y "Tema:" (siempre "Planilla de cómputo y desglose de
	// precios", el título del documento) no se usan en el sistema.
	private static EncabezadoPresupuesto leerEncabezado(Workbook libro, Sheet hoja, int filaEncabezado) {
		Map<String, String> valores = new java.util.HashMap<>();
		LocalDate fecha = null;
		for (int i = 0; i < filaEncabezado; i++) {
			Row fila = hoja.getRow(i);
			if (fila == null) {
				continue;
			}
			for (Cell c : fila) {
				if (fecha == null && esFecha(c)) {
					fecha = c.getLocalDateTimeCellValue().toLocalDate();
					continue;
				}
				Matcher m = ETIQUETA.matcher(normalizarEspacios(texto(c)));
				if (!m.matches()) {
					continue;
				}
				String etiqueta = m.group(1).toLowerCase();
				String valor = m.group(2).isBlank() ? textoALaDerecha(fila, c.getColumnIndex()) : m.group(2).trim();
				if (!valor.isEmpty()) {
					valores.putIfAbsent(etiqueta.equals("sres") ? "a" : etiqueta, valor);
				}
			}
		}

		return new EncabezadoPresupuesto(valores.get("obra"), valores.get("a"), valores.get("at"),
				valores.get("v/ref"), fecha, buscarPlazo(libro));
	}

	// Plazo cotizado: "Plazo de ejecución: N días" (texto de la hoja RESUMEN, el que ve el cliente);
	// si no está, el número al lado de "Plazo de Obra dias CORRIDOS" (hoja PRECIOS OBRA).
	private static Integer buscarPlazo(Workbook libro) {
		Integer corridos = null;
		for (Sheet hoja : libro) {
			for (Row fila : hoja) {
				for (Cell c : fila) {
					String t = normalizar(texto(c));
					Matcher m = PLAZO_EJECUCION.matcher(t);
					if (m.find()) {
						return Integer.valueOf(m.group(1));
					}
					if (corridos == null && t.startsWith("plazo de obra dias corridos")) {
						corridos = primerNumero(fila);
					}
				}
			}
		}
		return corridos;
	}

	private static Integer primerNumero(Row fila) {
		for (Cell c : fila) {
			CellType tipo = c.getCellType() == CellType.FORMULA ? c.getCachedFormulaResultType() : c.getCellType();
			if (tipo == CellType.NUMERIC && c.getNumericCellValue() > 0) {
				return (int) Math.ceil(c.getNumericCellValue());
			}
		}
		return null;
	}

	private static boolean esFecha(Cell c) {
		CellType tipo = c.getCellType() == CellType.FORMULA ? c.getCachedFormulaResultType() : c.getCellType();
		return tipo == CellType.NUMERIC && DateUtil.isCellDateFormatted(c);
	}

	private static String textoALaDerecha(Row fila, int columna) {
		for (int j = columna + 1; j < fila.getLastCellNum(); j++) {
			String t = normalizarEspacios(texto(fila.getCell(j)));
			if (!t.isEmpty()) {
				return t;
			}
		}
		return "";
	}

	// Texto de la celda (o del último valor calculado, si es fórmula). Los números enteros
	// van sin ".0" (ej. un código numérico).
	static String texto(Cell c) {
		if (c == null) {
			return "";
		}
		CellType tipo = c.getCellType() == CellType.FORMULA ? c.getCachedFormulaResultType() : c.getCellType();
		return switch (tipo) {
			case STRING -> c.getStringCellValue();
			case NUMERIC -> {
				double v = c.getNumericCellValue();
				yield v == Math.rint(v) ? String.valueOf((long) v) : String.valueOf(v);
			}
			case BOOLEAN -> String.valueOf(c.getBooleanCellValue());
			default -> "";
		};
	}

	static String normalizarEspacios(String texto) {
		return texto.replace(' ', ' ').replaceAll("\\s+", " ").trim();
	}

	// Para comparar encabezados: sin tildes, en minúsculas, sin "[ $ ]" y con un solo espacio.
	static String normalizar(String texto) {
		String sinTildes = Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
		return normalizarEspacios(sinTildes.toLowerCase().replaceAll("[\\[\\]$]", " "));
	}
}
