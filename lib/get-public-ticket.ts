import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './supabase/config';
import { validTicketToken, type PublicTicket } from './public-ticket';
export async function getPublicTicket(token: string): Promise<PublicTicket | null> {
  if (!validTicketToken(token)) return null;
  const { url, key } = getSupabaseConfig();
  // Always anonymous: opening a ticket does not require or reuse an admin session.
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
  const { data, error } = await supabase.rpc('get_public_ticket', { p_token: token });
  if (error) throw new Error('Ticket lookup unavailable');
  return data as PublicTicket | null;
}
