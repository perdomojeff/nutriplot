import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Cliente con la sesión de quien visita: RLS decide qué puede ver. */
export async function supabaseServer() {
  const c = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => c.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => c.set(name, value, options)); } catch { /* Server Component: lo refresca el middleware */ } },
    },
  });
}
