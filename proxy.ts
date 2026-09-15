import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig } from './lib/supabase/config';
import { isAdmin } from './lib/admin-access';

// Next.js 16 calls middleware "Proxy". Only admin routes are matched.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  const authorized = !error && isAdmin(user, process.env.ADMIN_USER_ID);
  const login = request.nextUrl.pathname === '/admin/login';
  if ((!authorized && !login) || (authorized && login)) {
    const target = request.nextUrl.clone();
    target.pathname = authorized ? '/admin' : '/admin/login';
    target.search = '';
    if (user && !authorized) target.searchParams.set('error', 'access');
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    response = redirect;
  }
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}
export const config = { matcher: ['/admin/:path*'] };
