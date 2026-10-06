// Lógica pura del recordatorio de check-in (fácil de probar, sin Supabase ni red).
export const MENSAJE_RECORDATORIO = {
  title: 'NutriPlot · Tu check-in es mañana',
  body: 'Mañana es día de comprobar tus avances y recuerda que el plan no se desbloquea hasta que hagas tu check-in.',
};

const DIA = 86_400_000;
const aUTC = (iso: string) => Date.parse(iso + 'T00:00:00Z');
const aISO = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Fecha (yyyy-mm-dd) en que se abre el próximo check-in.
 *  ultimaSemana = 0 si solo existe el Día 0; si ya hiciste la semana N, el próximo es el de la N+1. */
export function fechaProximoCheckin(fechaInicio: string, ultimaSemana: number): string {
  return aISO(aUTC(fechaInicio) + (ultimaSemana + 1) * 7 * DIA);
}

/** Fecha de hoy en la zona horaria de la persona (yyyy-mm-dd). */
export function hoyEnZona(zona: string, ahora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora);
}

/** Hora local (0-23) en la zona de la persona. */
export function horaEnZona(zona: string, ahora = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: zona, hour: '2-digit', hour12: false }).format(ahora)) % 24;
}

/** true si mañana (en la zona de la persona) es el día del próximo check-in. */
export function esVisperaDeCheckin(fechaInicio: string, ultimaSemana: number, zona: string, ahora = new Date()): boolean {
  const manana = aISO(aUTC(hoyEnZona(zona, ahora)) + DIA);
  return fechaProximoCheckin(fechaInicio, ultimaSemana) === manana;
}
