// Formatos de pantalla en es-AR (montos en pesos sin IVA, cantidades y fechas ISO del backend).

const PESOS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});
const NUMERO = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });
const MILLONES = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

export function pesos(valor: number | null | undefined): string {
  return valor == null ? '' : PESOS.format(valor);
}

// "$ 15,9 M" para los totales grandes (solapa Presupuesto, "total sin IVA").
export function pesosCorto(valor: number | null | undefined): string {
  if (valor == null) return '';
  return Math.abs(valor) >= 1_000_000 ? `$ ${MILLONES.format(valor / 1_000_000)} M` : PESOS.format(valor);
}

export function numero(valor: number | null | undefined): string {
  return valor == null ? '' : NUMERO.format(valor);
}

// "2026-10-13" → "13/10/2026" (sin pasar por Date, para no correr el día por la zona horaria).
export function fecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [anio, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

// "13/10" (fechas cortas de la lista de tareas).
export function fechaCorta(iso: string | null | undefined): string {
  return iso ? fecha(iso).slice(0, 5) : '—';
}

// Fecha de hoy en hora local, como "2026-10-13" (toISOString() da la fecha UTC: de noche
// en Argentina ya sería mañana).
export function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Días de "desde" a "hasta" (negativo si "hasta" es anterior), entre fechas ISO.
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta.slice(0, 10)}T00:00:00Z`) - Date.parse(`${desde.slice(0, 10)}T00:00:00Z`)) / 86_400_000);
}

// Iniciales de un proyecto para el cuadrado de color del listado ("Ampliación Subestación" → "AS").
export function iniciales(nombre: string): string {
  const palabras = nombre.split(/\s+/).filter((p) => p.length > 2);
  return (palabras.length ? palabras : [nombre]).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}
