import type { SupabaseClient } from '@supabase/supabase-js';

export type AttendanceTicket = {
  id: string;
  buyer_name: string;
  buyer_phone: string;
  status: string;
  ticket_type: { name: string } | null;
};

export async function loadAttendance(client: SupabaseClient, eventId: string): Promise<AttendanceTicket[]> {
  const tickets: AttendanceTicket[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from('tickets')
      .select('id,buyer_name,buyer_phone,status,ticket_type:ticket_types!ticket_type_id(name)')
      .eq('event_id', eventId).neq('status', 'annule')
      .order('sold_at').order('id').range(offset, offset + 499);
    if (error) throw error;
    tickets.push(...(data as unknown as AttendanceTicket[]));
    if (data.length < 500) return tickets;
  }
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim();
export function matchesBuyer(ticket: AttendanceTicket, query: string) {
  const search = normalize(query);
  const digits = search.replace(/\D/g, '');
  return !search || normalize(ticket.buyer_name).includes(search)
    || ticket.buyer_phone.includes(search)
    || (digits.length > 0 && /^[+\d\s().-]+$/.test(search) && ticket.buyer_phone.replace(/\D/g, '').includes(digits));
}
