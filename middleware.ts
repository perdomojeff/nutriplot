import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLICAS = ['/login', '/auth', '/api/cron', '/sw.js', '/manifest.webmanifest', '/icon', '/apple-icon', '/favicon', '/recetas'];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await sb.auth.getUser();
  const ruta = req.nextUrl.pathname;
  if (!user && !PUBLICAS.some((p) => ruta.startsWith(p))) {
    const url = req.nextUrl.clone(); url.pathname = '/login'; url.search = '';
    return NextResponse.redirect(url);
  }
  return res;
}
export const config = { matcher: ['/((?!_next/static|_next/image|.*\\.(?:png|jpg|svg|ico|webp)$).*)'] };
