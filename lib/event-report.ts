import type { SupabaseClient } from '@supabase/supabase-js';

export type ReportTicket = { id: string; ticket_type_id: string; buyer_name: string; buyer_phone: string; price_paid: number | string; status: string };
export type ReportType = { id: string; name: string };
export async function loadReport(client: SupabaseClient, eventId: string) {
  const tickets: ReportTicket[] = [];
  const types: ReportType[] = [];
  await Promise.all([
    (async () => {
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await client.from('tickets').select('id,ticket_type_id,buyer_name,buyer_phone,price_paid,status').eq('event_id', eventId).order('id').range(offset, offset + 499);
        if (error) throw error;
        tickets.push(...data);
        if (data.length < 500) break;
      }
    })(),
    (async () => {
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await client.from('ticket_types').select('id,name').eq('event_id', eventId).order('created_at').order('id').range(offset, offset + 499);
        if (error) throw error;
        types.push(...data);
        if (data.length < 500) break;
      }
    })(),
  ]);
  return { tickets, types };
}

export function typeBreakdown(types: ReportType[], tickets: ReportTicket[]) {
  const rows = new Map(types.map(type => [type.id, { ...type, sold: 0, cents: 0 }]));
  for (const ticket of tickets) {
    if (ticket.status === 'annule') continue;
    const row = rows.get(ticket.ticket_type_id) ?? { id: ticket.ticket_type_id, name: 'Type indisponible', sold: 0, cents: 0 };
    row.sold++;
    row.cents += Math.round(Number(ticket.price_paid) * 100);
    rows.set(row.id, row);
  }
  return [...rows.values()];
}

export function attendanceRate(sold: number, used: number) {
  return sold === 0 ? 0 : used / sold * 100;
}

// Quote every cell; neutralize spreadsheet formulas in user-entered text.
function csvText(value: string) {
  const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function reportCsv(types: ReportType[], tickets: ReportTicket[]) {
  const names = new Map(types.map(type => [type.id, type.name]));
  const rows = [['Nom', 'Téléphone', 'Type', 'Prix payé', 'Statut'].map(csvText).join(';')];
  for (const ticket of tickets) rows.push([
    csvText(ticket.buyer_name), csvText(ticket.buyer_phone), csvText(names.get(ticket.ticket_type_id) ?? 'Type indisponible'),
    csvText(Number(ticket.price_paid).toFixed(2).replace('.', ',')), csvText(ticket.status),
  ].join(';'));
  return '\uFEFF' + rows.join('\r\n') + '\r\n';
}
