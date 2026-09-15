import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import { isAdmin } from './admin-access';
// Reuse in every future server action / route handler that accesses admin data.
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !isAdmin(user, process.env.ADMIN_USER_ID)) redirect('/admin/login');
  return user!;
}
