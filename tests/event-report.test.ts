import { describe, expect, it } from 'vitest';
import { attendanceRate, reportCsv, sellerBreakdown, typeBreakdown, type ReportTicket } from '../lib/event-report';
const types = [{ id: 'a', name: 'Standard' }, { id: 'b', name: 'Standard' }, { id: 'c', name: 'VIP' }];
const ticket = (id: string, status: string, price_paid: number | string, ticket_type_id = 'a', sold_by: string | null = null): ReportTicket => ({ id, sold_by, status, price_paid, ticket_type_id, buyer_name: 'Élodie', buyer_phone: '+18195550123' });
describe('event report', () => {
  it('sums actual paid prices, ignores cancellations and retains zero-sale types', () => {
    const rows = typeBreakdown(types, [ticket('1', 'valide', '10.10'), ticket('2', 'utilise', '0.20'), ticket('3', 'annule', 99), ticket('4', 'valide', 7, 'b')]);
    expect(rows.map(row => [row.sold, row.cents])).toEqual([[2, 1030], [1, 700], [0, 0]]);
  });
  it('counts each non-cancelled ticket once for its seller and type, including already scanned tickets', () => {
    const rows = sellerBreakdown(types, [
      ticket('1', 'valide', 10, 'a', ' Awa '), ticket('2', 'utilise', 10, 'a', 'Awa'),
      ticket('3', 'valide', 25, 'c', 'Awa'), ticket('4', 'valide', 12, 'b', 'Jo'),
      ticket('5', 'annule', 25, 'c', 'Jo'), ticket('6', 'utilise', 25, 'c', null),
      ticket('7', 'valide', 25, 'c', ' '),
    ]);
    expect(rows).toEqual([
      { seller: 'Awa', sold: 3, categories: [{ id: 'a', name: 'Standard', count: 2 }, { id: 'c', name: 'VIP', count: 1 }] },
      { seller: null, sold: 2, categories: [{ id: 'c', name: 'VIP', count: 2 }] },
      { seller: 'Jo', sold: 1, categories: [{ id: 'b', name: 'Standard', count: 1 }] },
    ]);
    expect(sellerBreakdown(types, [ticket('1', 'annule', 30)])).toEqual([]);
  });
  it('handles an empty event without dividing by zero', () => {
    expect(attendanceRate(0, 0)).toBe(0);
    expect(attendanceRate(4, 3)).toBe(75);
  });
  it('exports cancelled tickets and safely quotes accents, separators, multiline values and formulas', () => {
    const row = { ...ticket('1', 'annule', 12.5), sold_by: '=Vendeur', buyer_name: '=SUM(1;2)\n"Élodie"' };
    const csv = reportCsv(types, [row]);
    expect(csv.startsWith('\uFEFF"Nom";"Téléphone"')).toBe(true);
    expect(csv).toContain('"\'=SUM(1;2)\n""Élodie"""');
    expect(csv).toContain('"\'+18195550123"');
    expect(csv).toContain('"Standard";"12,50";"annule"');
    expect(csv).toContain('"Statut";"Vendu par"');
    expect(csv).toContain('"annule";"\'=Vendeur"');
    expect(reportCsv(types, []).split('\r\n')).toHaveLength(2);
  });
});
