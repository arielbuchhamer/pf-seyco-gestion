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

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/*
 * COTIZACIÓN DEL DÓLAR (para ver las obras en dólares y sacar el efecto de la inflación)
 * Historia diaria desde 2011 de la API pública argentinadatos.com (sin clave):
 *   GET https://api.argentinadatos.com/v1/cotizaciones/dolares/{casa}  -> [{casa, compra, venta, fecha}]
 * Se usa el valor de venta. La casa (oficial, blue, bolsa...) se configura con cotizacion.dolar.casa.
 * Se guarda en memoria y se renueva cada 6 h. Si la API no responde, se sigue con lo último que
 * se tenga (o sin cotización: la vista en dólares avisa que no está disponible) y no se reintenta
 * en cada pedido sino cada 5 minutos, para no demorar las pantallas.
 */
@Service
public class CotizacionDolarService {

	private static final Logger log = LoggerFactory.getLogger(CotizacionDolarService.class);
	private static final Duration VIGENCIA = Duration.ofHours(6);
	private static final Duration REINTENTO = Duration.ofMinutes(5);

	// Valor de un día: si ese día no hubo cotización (fin de semana, feriado), la anterior.
	public record Cotizacion(LocalDate fecha, BigDecimal venta) {
	}

	private record Fila(String casa, BigDecimal compra, BigDecimal venta, LocalDate fecha) {
	}

	private final String url;
	private final String casa;
	private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
	private final JsonMapper json = JsonMapper.builder().build();

	private volatile NavigableMap<LocalDate, BigDecimal> historia = Collections.emptyNavigableMap();
	private volatile Instant actualizada;
	private volatile Instant ultimoIntento;

	public CotizacionDolarService(
			@Value("${cotizacion.dolar.url:https://api.argentinadatos.com/v1/cotizaciones/dolares/}") String url,
			@Value("${cotizacion.dolar.casa:oficial}") String casa) {
		this.url = url;
		this.casa = casa;
	}

	public String casa() {
		return casa;
	}

	// Cotización al día pedido (o la última anterior). Vacío si no hay datos.
	public Optional<Cotizacion> al(LocalDate fecha) {
		Map.Entry<LocalDate, BigDecimal> e = historiaVigente().floorEntry(fecha);
		return e == null ? Optional.empty() : Optional.of(new Cotizacion(e.getKey(), e.getValue()));
	}

	public Optional<Cotizacion> hoy() {
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
			return; // otro hilo ya la actualizó
		}
		ultimoIntento = ahora;
		try {
			HttpRequest pedido = HttpRequest.newBuilder(URI.create(url + casa)).timeout(Duration.ofSeconds(10)).GET().build();
			HttpResponse<String> respuesta = http.send(pedido, HttpResponse.BodyHandlers.ofString());
			if (respuesta.statusCode() != 200) {
				throw new IllegalStateException("HTTP " + respuesta.statusCode());
			}
			List<Fila> filas = json.readValue(respuesta.body(), new TypeReference<List<Fila>>() {
			});
			TreeMap<LocalDate, BigDecimal> nueva = new TreeMap<>();
			for (Fila f : filas) {
				if (f.fecha() != null && f.venta() != null && f.venta().signum() > 0) {
					nueva.put(f.fecha(), f.venta());
				}
			}
			if (!nueva.isEmpty()) {
				historia = Collections.unmodifiableNavigableMap(nueva);
				actualizada = ahora;
				log.info("Cotización del dólar {} actualizada: {} días, último {} = ${}", casa, nueva.size(),
						nueva.lastKey(), nueva.lastEntry().getValue());
			}
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
		} catch (Exception e) {
			log.warn("No se pudo obtener la cotización del dólar ({}): {}", url + casa, e.toString());
		}
	}
}
