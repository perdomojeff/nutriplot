import { z } from 'zod';
// Todo es obligatorio: sin estos datos y las 2 fotos, el plan siguiente no se desbloquea.
export const checkinSchema = z.object({
  peso_kg: z.coerce.number().min(30).max(300),
  masa_muscular_pct: z.coerce.number().min(5).max(80),
  grasa_subcutanea_pct: z.coerce.number().min(2).max(70),
  grasa_visceral: z.coerce.number().min(1).max(60),
  pecho_cm: z.coerce.number().positive(), cintura_cm: z.coerce.number().positive(), cadera_cm: z.coerce.number().positive(),
  muslo_cm: z.coerce.number().positive(), biceps_cm: z.coerce.number().positive(),
  pasos_semana: z.coerce.number().int().min(0).max(300000).optional(),
});
