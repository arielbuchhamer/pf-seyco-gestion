# Requerimientos del cliente: estado

Seguimiento de lo que pidió Seyco y dónde está resuelto en la aplicación.

## Estado por requerimiento

| # | Requerimiento | Estado | Dónde |
|---|---|---|---|
| 1 | Rendimiento por plazo (cotizó 30 días y lo hizo en 20 → positivo) | ✅ | Proyecto › Indicadores: "¿Va a tiempo?" y aviso "Adelanto de X días" |
| 2 | Rendimiento por costo (cotizó $30 M de grúa y van $40 M → negativo) | ✅ | Por rubro y **por renglón del presupuesto** (Indicadores › "Cotizado vs. real por renglón") |
| 3 | Gráfico de torta: % de materiales, equipos, etc. | ✅ | Indicadores › "¿En qué se gastó?" |
| 4 | Análisis proyectado vs. real | ✅ | Curva S, avance plan vs. real, SPI/CPI, Portafolio |
| 5 | Filtros por tipo de cliente (EPE, Vialidad, privado, industria) y tipo de obra | ✅ | Portafolio › Filtros |
| 6 | Filtro por monto | ✅ | Portafolio › Filtros |
| 7 | Filtro por año | ✅ | Portafolio › selector "Todos los años" |
| 8 | Certificaciones (anticipo 30 %, avances cada 2-3 meses) | ✅ | Proyecto › Certificaciones, con avisos |
| 9 | Que no se pierda el saldo final (el 15 % que nadie sigue) | ✅ | Aviso crítico en la obra y pantalla **Cobranzas** |
| 10 | Cuánta plata queda por cobrar | ✅ | Portafolio y **Cobranzas** |
| 11 | Reporte del estado de la obra | ✅ | Proyecto › "Reporte de obra" (imprimir o guardar PDF) |

## Lo que se agregó en esta etapa

### Filtro por año (Portafolio)
Selector "Todos los años / 2026 / 2025…" en la cabecera del Portafolio. El año de una obra es el de
su fecha de inicio (o el de la importación si no tiene).

### Costos por renglón del presupuesto
Al cargar un gasto real (Proyecto › Costos reales) se puede elegir, opcionalmente, el renglón del
presupuesto al que corresponde, por ejemplo "Hora de grúa 25 t". El formulario muestra cuánto se
cotizó en ese renglón. En Indicadores aparece la tabla "Cotizado vs. real por renglón" y, si se
pasa, el aviso **"Hora de grúa 25 t excedido: se cotizaron $30.000.000 y van $40.000.000 (+33 %)"**.
- Base de datos: columna nueva `costo_real.item_presupuesto_id` (opcional, referencia a `item_presupuesto`).

### Pantalla Cobranzas (Gestión global)
Toda la plata pendiente de todas las obras en una sola pantalla:
- Indicadores: falta cobrar en total, facturado sin cobrar, sin certificar y **"se puede perder"**
  (saldo sin certificar en obras terminadas).
- Obras con plata pendiente, primero las más urgentes, con el motivo
  (obra terminada sin certificar, factura con más de 60 días, avance sin certificar, etc.).
- Facturas sin cobrar, de la más vieja a la más nueva, con los días que llevan.

### La obra en dólares (sin el efecto de la inflación)
En Indicadores, el panel "La obra en dólares" pasa lo cotizado a dólares con la cotización **del
día del presupuesto** y cada gasto con la **del día en que se hizo**. Así un rubro "excedido" no
es sólo inflación. También muestra el presupuesto llevado a pesos de hoy.
- Cotización: API pública y gratuita [argentinadatos.com](https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial)
  (historia diaria desde 2011, sin clave). Por defecto el dólar oficial; se cambia con
  `cotizacion.dolar.casa` (`blue`, `bolsa`, etc.) en `application.properties`.
- El backend guarda la historia en memoria y la renueva cada 6 h. Si la API no responde, la
  aplicación sigue funcionando y el panel avisa que la cotización no está disponible.

### Aprendizaje por tipo de obra (Portafolio)
Tabla con el desvío promedio de las obras de cada tipo (zanjeo, iluminación, redes, industrial):
plazo (% de días de más o de menos), costo (% gastado de más o de menos respecto de lo avanzado)
y el rubro que más se pasa. Sirve para cotizar mejor la próxima obra. Se ve cuando el Portafolio
tiene más de una obra.

### Exportar a Excel
Botón "Excel" en el Portafolio (respeta los filtros aplicados, con una hoja de aprendizaje), en
Cobranzas (obras y facturas) y en la solapa Certificaciones de cada obra.

### Limpieza
- Se quitó el endpoint `/api/proyectos/{id}/rendimiento`: no lo usaba ninguna pantalla y dependía
  del historial de cambios de estado de las tareas, que todavía no se carga. El rendimiento por
  plazo lo cubren los Indicadores.
- Se quitó el panel `paneles-tareas` (las tareas están dentro de cada proyecto): el backend lo
  borra solo al arrancar.

## Pendiente

- **Aviso por correo:** resumen periódico (por ejemplo semanal) de saldos sin certificar en obras
  terminadas y certificaciones sin cobrar, para los responsables de cobranza. El envío de correos ya
  existe en el backend (`CorreoService`, el de "¿Olvidaste tu contraseña?") y los datos ya los
  calcula `CobranzaService`, así que falta la tarea programada y el armado del correo.

## Notas para levantar el proyecto

- Después de actualizar, **reiniciar el backend** (`mvn spring-boot:run`) para que tome los cambios
  y cree la columna nueva.
- Si una computadora tiene un antivirus que inspecciona HTTPS (Avast, Kaspersky, ESET…), Java no
  puede conectarse a la API del dólar ni bajar dependencias. Se soluciona con la variable de
  entorno de usuario `JAVA_TOOL_OPTIONS=-Djavax.net.ssl.trustStoreType=Windows-ROOT` (Windows).
