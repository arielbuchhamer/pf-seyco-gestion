package com.seyco.gestion.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import com.seyco.gestion.dto.SeguimientoDtos.AprendizajeTipoObra;
import com.seyco.gestion.dto.SeguimientoDtos.Cobranzas;
import com.seyco.gestion.dto.SeguimientoDtos.FacturaPendiente;
import com.seyco.gestion.dto.SeguimientoDtos.NivelAlerta;
import com.seyco.gestion.dto.SeguimientoDtos.ObraCobranza;
import com.seyco.gestion.dto.SeguimientoDtos.Portafolio;
import com.seyco.gestion.dto.SeguimientoDtos.ResumenCertificacion;
import com.seyco.gestion.dto.SeguimientoDtos.ResumenProyecto;
import com.seyco.gestion.entity.Certificacion;
import com.seyco.gestion.entity.EstadoCertificacion;
import com.seyco.gestion.entity.EstadoProyecto;
import com.seyco.gestion.entity.Proyecto;
import com.seyco.gestion.entity.Rubro;
import com.seyco.gestion.entity.TipoCertificacion;
import com.seyco.gestion.entity.TipoCliente;
import com.seyco.gestion.entity.TipoObra;

// Exportación a Excel (.xlsx) para administración: Portafolio (con los filtros aplicados),
// Cobranzas y las certificaciones de una obra. Montos en pesos sin IVA, igual que en pantalla.
@Service
public class ExportacionExcelService {

	public static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

	private static final Map<Enum<?>, String> ETIQUETAS = Map.ofEntries(
			Map.entry(TipoCliente.EPE, "EPE"), Map.entry(TipoCliente.VIALIDAD, "Vialidad"),
			Map.entry(TipoCliente.PRIVADO, "Privado"), Map.entry(TipoCliente.INDUSTRIA, "Industria"),
			Map.entry(TipoObra.ZANJEO, "Zanjeo"), Map.entry(TipoObra.ILUMINACION, "Iluminación"),
			Map.entry(TipoObra.REDES_ENERGIA, "Redes de energía"), Map.entry(TipoObra.INDUSTRIAL, "Industrial"),
			Map.entry(TipoObra.OTRA, "Otra"), Map.entry(EstadoProyecto.PLANIFICADO, "Planificado"),
			Map.entry(EstadoProyecto.EN_CURSO, "En curso"), Map.entry(EstadoProyecto.FINALIZADO, "Finalizado"),
			Map.entry(TipoCertificacion.ANTICIPO, "Anticipo"), Map.entry(TipoCertificacion.AVANCE, "Avance"),
			Map.entry(TipoCertificacion.FINAL, "Final"), Map.entry(EstadoCertificacion.PENDIENTE_COBRO, "Pendiente de cobro"),
			Map.entry(EstadoCertificacion.COBRADA, "Cobrada"), Map.entry(Rubro.MANO_OBRA, "Mano de obra"),
			Map.entry(Rubro.EQUIPOS, "Equipos y grúas"), Map.entry(Rubro.MATERIALES, "Materiales"),
			Map.entry(Rubro.TERCEROS, "Provisión de terceros"), Map.entry(NivelAlerta.CRITICA, "Urgente"),
			Map.entry(NivelAlerta.ADVERTENCIA, "Revisar"), Map.entry(NivelAlerta.INFO, "Al día"));

	// Porcentaje de 0 a 100 (se muestra con un decimal y el signo %).
	private record Pct(Double valor) {
	}

	public byte[] portafolio(Portafolio portafolio) {
		return libro(wb -> {
			Hoja obras = new Hoja(wb, "Obras", "Portafolio de obras");
			obras.encabezado("Obra", "Cliente", "Tipo de cliente", "Tipo de obra", "Estado", "Inicio", "Fin", "Presupuesto",
					"Gastado", "Avance plan", "Avance real", "Desvío de plazo (días)", "Certificado", "Cobrado",
					"Facturado sin cobrar", "Sin certificar", "Falta cobrar", "Avisos urgentes");
			for (ResumenProyecto p : portafolio.proyectos()) {
				ResumenCertificacion c = p.certificacion();
				obras.fila(p.nombre(), p.cliente(), p.tipoCliente(), p.tipoObra(), p.estado(), p.fechaInicio(), p.fechaFin(),
						p.presupuesto(), p.costoReal(), new Pct(p.avancePlan()), new Pct(p.avanceReal()), p.desvioDias(),
						c.certificado(), c.cobrado(), c.pendienteCobro(), c.saldoPorCertificar(), c.saldoPorCobrar(),
						p.alertas().stream().filter(a -> a.nivel() == NivelAlerta.CRITICA).map(a -> a.titulo())
								.reduce((a, b) -> a + "; " + b).orElse(""));
			}
			var t = portafolio.totales();
			obras.total("Total (" + t.proyectos() + " obras)", 7, t.presupuesto(), t.costoReal(), null, null, null,
					t.certificado(), t.cobrado(), t.pendienteCobro(), t.saldoPorCertificar(), t.saldoPorCobrar());
			obras.cerrar();

			Hoja aprendizaje = new Hoja(wb, "Aprendizaje", "Desvío promedio por tipo de obra (+ = de más, − = de menos)");
			aprendizaje.encabezado("Tipo de obra", "Obras", "Desvío de plazo", "Obras con plazo", "Desvío de costo",
					"Obras con costos", "Rubro que más se excede", "Desvío del rubro");
			for (AprendizajeTipoObra a : portafolio.aprendizaje()) {
				aprendizaje.fila(a.tipoObra() == null ? "Sin clasificar" : a.tipoObra(), a.obras(), new Pct(a.desvioPlazo()),
						a.obrasConPlazo(), new Pct(a.desvioCosto()), a.obrasConCosto(), a.rubroMasExcedido(),
						new Pct(a.desvioRubro()));
			}
			aprendizaje.cerrar();
		});
	}

	public byte[] cobranzas(Cobranzas cobranzas) {
		return libro(wb -> {
			Hoja obras = new Hoja(wb, "Obras", "Cobranzas: lo que falta certificar y cobrar");
			obras.encabezado("Prioridad", "Motivo", "Obra", "Cliente", "Estado", "Avance", "Contrato", "Certificado",
					"Cobrado", "Facturado sin cobrar", "Sin certificar", "Falta cobrar", "Última certificación");
			for (ObraCobranza o : cobranzas.obras()) {
				ResumenCertificacion c = o.certificacion();
				obras.fila(o.nivel(), o.motivo(), o.nombre(), o.cliente(), o.estado(), new Pct(o.avanceReal()), c.montoContrato(),
						c.certificado(), c.cobrado(), c.pendienteCobro(), c.saldoPorCertificar(), c.saldoPorCobrar(),
						c.ultimaCertificacion());
			}
			obras.total("Total", 9, cobranzas.facturadoSinCobrar(), cobranzas.sinCertificar(), cobranzas.porCobrar());
			obras.cerrar();

			Hoja facturas = new Hoja(wb, "Facturas sin cobrar", "Certificaciones emitidas y no cobradas");
			facturas.encabezado("Obra", "N.º", "Tipo", "Emitida", "Factura", "Monto", "Días sin cobrar");
			for (FacturaPendiente f : cobranzas.facturas()) {
				facturas.fila(f.proyecto(), f.numero(), f.tipo(), f.fechaEmision(), f.nroFactura(), f.monto(), f.dias());
			}
			facturas.total("Total", 5, cobranzas.facturadoSinCobrar());
			facturas.cerrar();
		});
	}

	public byte[] certificaciones(Proyecto proyecto, List<Certificacion> lista, ResumenCertificacion resumen) {
		return libro(wb -> {
			Hoja hoja = new Hoja(wb, "Certificaciones", "Certificaciones de " + proyecto.getNombre());
			hoja.encabezado("N.º", "Tipo", "Emitida", "Porcentaje", "Monto", "Factura", "Estado", "Cobrada el",
					"Observaciones");
			for (Certificacion c : lista) {
				hoja.fila(c.getNumero(), c.getTipo(), c.getFechaEmision(),
						new Pct(c.getPorcentaje() == null ? null : c.getPorcentaje().doubleValue()), c.getMonto(),
						c.getNroFactura(), c.getEstado(), c.getFechaCobro(), c.getObservaciones());
			}
			hoja.total("Total certificado", 4, resumen.certificado());
			hoja.vacia();
			hoja.dato("Monto del contrato", resumen.montoContrato());
			hoja.dato("Cobrado", resumen.cobrado());
			hoja.dato("Facturado sin cobrar", resumen.pendienteCobro());
			hoja.dato("Sin certificar", resumen.saldoPorCertificar());
			hoja.dato("Falta cobrar", resumen.saldoPorCobrar());
			hoja.cerrar();
		});
	}

	private interface Contenido {
		void escribir(Workbook wb);
	}

	private static byte[] libro(Contenido contenido) {
		try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
			contenido.escribir(wb);
			wb.write(salida);
			return salida.toByteArray();
		} catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}

	// Una hoja con título, encabezado y filas; cada valor se escribe según su tipo.
	private static final class Hoja {
		private final Sheet sheet;
		private final CellStyle titulo;
		private final CellStyle encabezado;
		private final CellStyle pesos;
		private final CellStyle fecha;
		private final CellStyle pct;
		private final CellStyle negrita;
		private final CellStyle pesosNegrita;
		private int fila;
		private int columnas;

		Hoja(Workbook wb, String nombre, String tituloHoja) {
			sheet = wb.createSheet(nombre);
			var formato = wb.createDataFormat();
			Font fuenteNegrita = wb.createFont();
			fuenteNegrita.setBold(true);
			Font fuenteTitulo = wb.createFont();
			fuenteTitulo.setBold(true);
			fuenteTitulo.setFontHeightInPoints((short) 14);
			Font fuenteBlanca = wb.createFont();
			fuenteBlanca.setBold(true);
			fuenteBlanca.setColor(IndexedColors.WHITE.getIndex());

			titulo = wb.createCellStyle();
			titulo.setFont(fuenteTitulo);
			encabezado = wb.createCellStyle();
			encabezado.setFont(fuenteBlanca);
			encabezado.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
			encabezado.setFillPattern(FillPatternType.SOLID_FOREGROUND);
			encabezado.setWrapText(true);
			pesos = wb.createCellStyle();
			pesos.setDataFormat(formato.getFormat("$ #,##0.00"));
			fecha = wb.createCellStyle();
			fecha.setDataFormat(formato.getFormat("dd/mm/yyyy"));
			pct = wb.createCellStyle();
			pct.setDataFormat(formato.getFormat("0.0\" %\""));
			negrita = wb.createCellStyle();
			negrita.setFont(fuenteNegrita);
			negrita.setBorderTop(BorderStyle.THIN);
			pesosNegrita = wb.createCellStyle();
			pesosNegrita.cloneStyleFrom(pesos);
			pesosNegrita.setFont(fuenteNegrita);
			pesosNegrita.setBorderTop(BorderStyle.THIN);

			Cell celda = sheet.createRow(fila++).createCell(0);
			celda.setCellValue(tituloHoja);
			celda.setCellStyle(titulo);
			sheet.createRow(fila++).createCell(0)
					.setCellValue("Generado el " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
			fila++;
		}

		void encabezado(String... titulos) {
			Row row = sheet.createRow(fila++);
			for (int i = 0; i < titulos.length; i++) {
				Cell c = row.createCell(i);
				c.setCellValue(titulos[i]);
				c.setCellStyle(encabezado);
			}
			columnas = titulos.length;
			sheet.createFreezePane(0, fila);
		}

		void fila(Object... valores) {
			Row row = sheet.createRow(fila++);
			for (int i = 0; i < valores.length; i++) {
				escribir(row.createCell(i), valores[i], false);
			}
		}

		// Fila de totales: la etiqueta en la primera columna y los montos desde la columna indicada.
		void total(String etiqueta, int desde, BigDecimal... montos) {
			Row row = sheet.createRow(fila++);
			Cell c = row.createCell(0);
			c.setCellValue(etiqueta);
			c.setCellStyle(negrita);
			for (int i = 0; i < montos.length; i++) {
				escribir(row.createCell(desde + i), montos[i], true);
			}
		}

		void dato(String etiqueta, BigDecimal valor) {
			Row row = sheet.createRow(fila++);
			row.createCell(0).setCellValue(etiqueta);
			escribir(row.createCell(1), valor, false);
		}

		void vacia() {
			fila++;
		}

		private void escribir(Cell celda, Object valor, boolean enNegrita) {
			switch (valor) {
				case null -> {
				}
				case BigDecimal b -> {
					celda.setCellValue(b.doubleValue());
					celda.setCellStyle(enNegrita ? pesosNegrita : pesos);
				}
				case Pct p -> {
					if (p.valor() != null) {
						celda.setCellValue(p.valor());
						celda.setCellStyle(pct);
					}
				}
				case Number n -> celda.setCellValue(n.doubleValue());
				case LocalDate d -> {
					celda.setCellValue(d);
					celda.setCellStyle(fecha);
				}
				case Enum<?> e -> celda.setCellValue(ETIQUETAS.getOrDefault(e, e.name()));
				default -> celda.setCellValue(valor.toString());
			}
		}

		void cerrar() {
			for (int i = 0; i < columnas; i++) {
				sheet.autoSizeColumn(i);
				sheet.setColumnWidth(i, Math.min(Math.max(sheet.getColumnWidth(i), 10 * 256), 45 * 256));
			}
		}
	}
}
