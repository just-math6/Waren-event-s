import { describe, expect, it } from 'vitest';
import { validateEvent, type EventInput } from '../lib/event-input';
const valid = (): EventInput => ({ title: 'Concert', location: 'Salle', startsAt: '2027-06-01T19:00:00.000Z', ticketTypes: [{ name: 'Standard', price: '12,50', quantity: '100' }, { name: 'VIP', price: '0', quantity: '20' }] });
describe('event validation', () => {
  it('accepts multiple types, decimal comma and free tickets', () => expect(validateEvent(valid())).toBeNull());
  it.each(['-1','NaN','1e2','1.001','', '100000000'])('rejects invalid price %s', price => { const data = valid(); data.ticketTypes[0].price = price; expect(validateEvent(data)).not.toBeNull(); });
  it.each(['0','1.5','-2','2147483648'])('rejects invalid quantity %s', quantity => { const data = valid(); data.ticketTypes[0].quantity = quantity; expect(validateEvent(data)).not.toBeNull(); });
  it('requires at least one type', () => expect(validateEvent({ ...valid(), ticketTypes: [] })).not.toBeNull());
  it('rejects duplicate names ignoring case and spaces', () => { const data = valid(); data.ticketTypes[1].name = ' STANDARD '; expect(validateEvent(data)).not.toBeNull(); });
  it('rejects empty title and invalid date', () => { expect(validateEvent({ ...valid(), title: ' ' })).not.toBeNull(); expect(validateEvent({ ...valid(), startsAt: 'invalid' })).not.toBeNull(); });
});
