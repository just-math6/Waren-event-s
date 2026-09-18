import { describe, expect, it } from 'vitest';
import { attendanceRate, reportCsv, typeBreakdown, type ReportTicket } from '../lib/event-report';
const types = [{ id: 'a', name: 'Standard' }, { id: 'b', name: 'Standard' }, { id: 'c', name: 'VIP' }];
const ticket = (id: string, status: string, price_paid: number | string, ticket_type_id = 'a'): ReportTicket => ({ id, status, price_paid, ticket_type_id, buyer_name: 'Élodie', buyer_phone: '+18195550123' });
describe('event report', () => {
  it('sums actual paid prices, ignores cancellations and retains zero-sale types', () => {
    const rows = typeBreakdown(types, [ticket('1', 'valide', '10.10'), ticket('2', 'utilise', '0.20'), ticket('3', 'annule', 99), ticket('4', 'valide', 7, 'b')]);
    expect(rows.map(row => [row.sold, row.cents])).toEqual([[2, 1030], [1, 700], [0, 0]]);
  });
  it('handles an empty event without dividing by zero', () => {
    expect(attendanceRate(0, 0)).toBe(0);
    expect(attendanceRate(4, 3)).toBe(75);
  });
  it('exports cancelled tickets and safely quotes accents, separators, multiline values and formulas', () => {
    const row = { ...ticket('1', 'annule', 12.5), buyer_name: '=SUM(1;2)\n"Élodie"' };
    const csv = reportCsv(types, [row]);
    expect(csv.startsWith('\uFEFF"Nom";"Téléphone"')).toBe(true);
    expect(csv).toContain('"\'=SUM(1;2)\n""Élodie"""');
    expect(csv).toContain('"\'+18195550123"');
    expect(csv).toContain('"Standard";"12,50";"annule"');
    expect(reportCsv(types, []).split('\r\n')).toHaveLength(2);
  });
});
