package com.seyco.gestion.service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.NavigableMap;
import java.util.Optional;
import java.util.TreeMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/*
 * ÍNDICE CAC (Cámara Argentina de la Construcción), nivel general, mensual.
 * Sirve para llevar a valores de hoy lo que falta cobrar de una obra (solapa Certificaciones).
 * API pública sin clave:
 *   GET https://prestamos.ikiwi.net.ar/api/cacs  -> [{period: "2026-10-01", general, materials, labour_force}]
 * El índice de un mes se publica con unas semanas de atraso: si el mes pedido todavía no está, se
 * usa el último publicado (el del mes anterior). Se guarda en memoria y se renueva cada 6 h; si la
 * API no responde se sigue con lo último que se tenga y se reintenta cada 5 minutos.
 */
@Service
public class IndiceCacService {

	private static final Logger log = LoggerFactory.getLogger(IndiceCacService.class);
	private static final Duration VIGENCIA = Duration.ofHours(6);
	private static final Duration REINTENTO = Duration.ofMinutes(5);

	// Valor del índice para un mes (periodo = día 1 del mes).
	public record Indice(LocalDate periodo, BigDecimal valor) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record Fila(LocalDate period, BigDecimal general) {
	}

	private final String url;
	private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
	private final JsonMapper json = JsonMapper.builder().build();

	private volatile NavigableMap<LocalDate, BigDecimal> historia = Collections.emptyNavigableMap();
	private volatile Instant actualizada;
	private volatile Instant ultimoIntento;

	public IndiceCacService(@Value("${indice.cac.url:https://prestamos.ikiwi.net.ar/api/cacs}") String url) {
		this.url = url;
	}

	// Índice del mes de la fecha pedida o, si todavía no se publicó, el último anterior.
	public Optional<Indice> al(LocalDate fecha) {
		Map.Entry<LocalDate, BigDecimal> e = historiaVigente().floorEntry(fecha.withDayOfMonth(1));
		return e == null ? Optional.empty() : Optional.of(new Indice(e.getKey(), e.getValue()));
	}

	public Optional<Indice> hoy() {
		return al(LocalDate.now());
	}

	private NavigableMap<LocalDate, BigDecimal> historiaVigente() {
		Instant ahora = Instant.now();
		boolean vencida = actualizada == null || actualizada.plus(VIGENCIA).isBefore(ahora);
		boolean puedeReintentar = ultimoIntento == null || ultimoIntento.plus(REINTENTO).isBefore(ahora);
		if (vencida && puedeReintentar) {
			actualizar(ahora);
		}
		return historia;
	}

	private synchronized void actualizar(Instant ahora) {
		if (ultimoIntento != null && ultimoIntento.plus(REINTENTO).isAfter(ahora) && actualizada != null) {
			return; // otro hilo ya lo actualizó
		}
		ultimoIntento = ahora;
		try {
			HttpRequest pedido = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(10)).GET().build();
			HttpResponse<String> respuesta = http.send(pedido, HttpResponse.BodyHandlers.ofString());
			if (respuesta.statusCode() != 200) {
				throw new IllegalStateException("HTTP " + respuesta.statusCode());
			}
			List<Fila> filas = json.readValue(respuesta.body(), new TypeReference<List<Fila>>() {
			});
			TreeMap<LocalDate, BigDecimal> nueva = new TreeMap<>();
			for (Fila f : filas) {
				if (f.period() != null && f.general() != null && f.general().signum() > 0) {
					nueva.put(f.period().withDayOfMonth(1), f.general());
				}
			}
			if (!nueva.isEmpty()) {
				historia = Collections.unmodifiableNavigableMap(nueva);
				actualizada = ahora;
				log.info("Índice CAC actualizado: {} meses, último {} = {}", nueva.size(), nueva.lastKey(),
						nueva.lastEntry().getValue());
			}
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
		} catch (Exception e) {
			log.warn("No se pudo obtener el índice CAC ({}): {}", url, e.toString());
		}
	}
}
