// @ts-nocheck
// Recetario ampliado: 6 desayunos + 6 almuerzos + 6 cenas además de las 3 recetas modelo.
import { DESAYUNOS } from './recetas-desayunos';
import { ALMUERZOS } from './recetas-almuerzos';
import { CENAS } from './recetas-cenas';
export const EXTRA = [...DESAYUNOS, ...ALMUERZOS, ...CENAS];
