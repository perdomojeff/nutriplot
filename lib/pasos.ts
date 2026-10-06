// Evaluador de pasos semanales (meta: 70,000)
export const META_PASOS_SEMANA = 70_000;

export type NivelPasos = 'meta' | 'cerca' | 'lejos';

export interface FeedbackPasos {
  nivel: NivelPasos;
  mensaje: string;
  color: 'verde' | 'ambar' | 'suave';
}

export function evaluarPasos(pasos: number): FeedbackPasos {
  if (pasos >= META_PASOS_SEMANA) {
    return { nivel: 'meta', color: 'verde',
      mensaje: '¡Felicidades, sobrepasaste los 70 mil pasos de la semana! Tu constancia es increíble y tu cuerpo te lo agradece. ¡Sigue con esa gran energía!' };
  }
  if (pasos >= 55_000) {
    return { nivel: 'cerca', color: 'ambar',
      mensaje: 'Estuviste ligeramente en el promedio de los 70 mil pasos semanales. ¡Buen esfuerzo! Cada paso cuenta para mantenerte activo y saludable; la próxima semana estaremos aún más cerca.' };
  }
  return { nivel: 'lejos', color: 'suave',
    mensaje: 'Estuviste muy lejos de los 70 mil pasos semanales. No te preocupes, lo importante es notar cómo estuvo tu movimiento diario. Intentemos sumar pequeños paseos de 10 o 15 minutos esta semana para despertar el cuerpo. ¡Paso a paso se llega lejos!' };
}
