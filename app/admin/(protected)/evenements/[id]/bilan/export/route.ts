import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/sale-input';
import { loadReport, reportCsv } from '@/lib/event-report';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) return new Response('Événement introuvable', { status: 404 });
  const client = await createClient();
  const { data, error } = await client.from('events').select('id').eq('id', id).maybeSingle();
  if (error) return new Response('Export indisponible', { status: 503 });
  if (!data) return new Response('Événement introuvable', { status: 404 });
  try {
    const { tickets, types } = await loadReport(client, id);
    return new Response(reportCsv(types, tickets), { headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="billets-${id}.csv"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch { return new Response('Export indisponible', { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
