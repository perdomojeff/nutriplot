# NutriPlot 🌿

Control de peso y hábitos para cada miembro de la familia.

## Arquitectura (por qué este stack)

| Capa | Elección | Motivo |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Despliegue nativo en Vercel; Server Components + Route Handlers para generar planes/PDF sin servidor propio. |
| Estilos | **Tailwind CSS** | Paleta verde en `tailwind.config.ts` (`verde-50…900`), tarjetas `rounded-3xl`, mucho espacio en blanco para tablet. |
| Datos | **Supabase** (Postgres + Auth + Storage) | RLS por familia y rol (admin o miembro); fotos en bucket privado `fotos-progreso`. |
| Gráficos | **Recharts** | Curvas predictivas + real superpuestas. |
| PDF | **@react-pdf/renderer** | Maquetación controlada, tipografía grande, funciona en serverless. |
| Validación | **Zod** | Mismo esquema en cliente y servidor. |

## Modelo familiar y roles
Una `familia` → varios `usuarios`, **cada uno con su propio login** (`auth_user_id`).
- **Administrador** (quien crea la familia con `crear_familia()`): ve y edita a todos, invita familiares y tiene la pestaña «Familia».
- **Miembro**: solo ve y edita su propia sesión. Se une con el correo con que lo invitó el administrador (`reclamar_perfil()`).
- El aislamiento lo aplica la base de datos (RLS + funciones `puedo_ver` / `soy_admin_de`), no solo la interfaz. Un miembro no puede cambiar su rol ni su familia.
- Las fotos se guardan en `{familia_id}/{usuario_id}/semana-N/` y solo las abre su dueño y el administrador.

## Doble candado semanal
1. **UI/servidor:** `obtenerEstadoBloqueo()` en `lib/bloqueo.ts`.
2. **Base de datos:** la política RLS `planes_select_si_hay_checkin` impide leer el plan de la semana N sin check-in N, aunque alguien salte la UI.

## Salvaguardas de salud incluidas
- Piso calórico (1200 kcal F / 1500 kcal M) y tope de pérdida de 1 % del peso/semana: el modo «Estricto» se ajusta solo si sería excesivo (la fecha de meta se recalcula con el ritmo real).
- Advertencia si el peso deseado implica IMC < 18.5.
- Para **menores de edad** o personas con condiciones médicas, la app no debería aplicar déficit calórico sin supervisión pediátrica/médica. Recomendado: bloquear el modo adelgazamiento si edad < 18.

## Puesta en marcha
```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# Pegar supabase/schema.sql en el SQL Editor de Supabase
npm run dev
# Deploy: importar el repo en Vercel y definir las mismas variables de entorno
```

## Pendiente (siguientes iteraciones)
- Páginas `app/`: onboarding (Día 0), dashboard, check-in, plan, pasos.
- Route Handler `/api/plan` que genere el menú (IA o recetario) con foto de referencia y lo guarde con `service_role`.
- Rutinas de ejercicio (fuerza casa/gimnasio + cardio) en `rutinas_ejercicio`.

## Recordatorio de check-in (push)
Un día antes del check-in cada persona recibe: *«Mañana es día de comprobar tus avances y recuerda que el plan no se desbloquea hasta que hagas tu check-in.»*
- `supabase/migracion_push.sql`: tablas `push_suscripciones` (un dispositivo = una fila) y `recordatorios_enviados` (evita duplicados).
- `public/sw.js` + `lib/push-cliente.ts`: registro del service worker y botón «Activar recordatorios» (el navegador exige un toque).
- `app/api/cron/recordatorios/route.ts` + `vercel.json`: Vercel Cron diario (23:00 UTC = 7 p. m. EDT / 6 p. m. EST) que avisa solo a quien tiene el check-in mañana.
- Claves: `npx web-push generate-vapid-keys`, y definir las variables de `.env.example.push` en Vercel.
- **iPhone/iPad**: el aviso funciona solo si la app está instalada en la pantalla de inicio (iOS 16.4+). Android y escritorio no lo requieren.
- El plan Hobby de Vercel permite un cron al día; con el plan Pro se puede ejecutar cada hora y respetar la zona horaria de cada persona.

## Metas en «Tu camino semana a semana»
`components/GraficoProgreso.tsx` muestra **Meta deseada (Día 0)**, fija, y **Meta deseada realista**, recalculada con cada check-in, con la diferencia en semanas.
