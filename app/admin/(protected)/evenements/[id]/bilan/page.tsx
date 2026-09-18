import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/sale-input';
import { attendanceRate, loadReport, typeBreakdown } from '@/lib/event-report';
import ExportCsv from './export-csv';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const client = await createClient();
  const { data: summary, error } = await client.from('event_summary').select('title,billets_vendus,billets_scannes,recettes_totales').eq('event_id', id).maybeSingle();
  if (error) return <p role="alert" className="card text-red-600">Impossible de charger le bilan. Réessayez.</p>;
  if (!summary) notFound();
  let report;
  try { report = await loadReport(client, id); } catch { report = null; }
  const amount = (value: number) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const rate = attendanceRate(Number(summary.billets_vendus), Number(summary.billets_scannes));
  return <div className="space-y-6">
    <Link href="/admin/evenements" className="text-sm text-gray-500 underline">Retour aux événements</Link>
    <header><h1 className="text-2xl font-semibold">Bilan — {summary.title}</h1><p className="mt-2 text-sm text-gray-500">Recettes et présence hors billets annulés.</p></header>
    <dl className="grid grid-cols-2 gap-4">
      <div className="card"><dt className="text-sm text-gray-500">Recettes totales</dt><dd className="mt-2 break-words text-2xl font-semibold">{amount(Number(summary.recettes_totales))}</dd></div>
      <div className="card"><dt className="text-sm text-gray-500">Taux de présence</dt><dd className="mt-2 text-2xl font-semibold text-green-600">{new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(rate)} %</dd><dd className="mt-1 text-sm text-gray-500">{summary.billets_scannes} / {summary.billets_vendus} billets vendus</dd></div>
    </dl>
    <section className="card"><h2 className="mb-3 font-semibold">Répartition par type de billet</h2>
      {!report ? <p role="alert" className="text-sm text-red-600">Impossible de charger la répartition. Actualisez la page.</p> : report.types.length === 0 && report.tickets.length === 0 ? <p className="text-sm text-gray-500">Aucun type de billet pour cet événement.</p> : <ul className="divide-y divide-gray-200">{typeBreakdown(report.types, report.tickets).map(row => <li key={row.id} className="flex items-center justify-between gap-4 py-4"><div className="min-w-0"><h3 className="break-words font-medium">{row.name}</h3><p className="mt-1 text-sm text-gray-500">{row.sold} vendu(s)</p></div><p className="shrink-0 font-semibold">{amount(row.cents / 100)}</p></li>)}</ul>}
    </section>
    <ExportCsv eventId={id} />
    <p className="text-sm text-gray-500">L’export contient tous les billets, y compris les billets annulés, avec leur statut.</p>
  </div>;
}
