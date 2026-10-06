import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Cliente con la sesión de quien visita: RLS decide qué puede ver. */
export async function supabaseServer() {
  const c = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => c.getAll(),
      setAll: (list: { name: string; value: string; options?: any }[]) => { try { list.forEach(({ name, value, options }: { name: string; value: string; options?: any }) => c.set(name, value, options)); } catch { /* Server Component: lo refresca el middleware */ } },
    },
  });
}
