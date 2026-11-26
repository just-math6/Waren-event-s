export const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const phoneHint = 'Burkina Faso : 8 chiffres. Autre pays : commencez par + et l’indicatif pays.';
export function normalizePhone(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, '');
  if (!/^\+?\d+$/.test(compact)) return '';
  if (/^\d{8}$/.test(compact) && !compact.startsWith('00')) return '226' + compact;
  return compact.replace(/^(?:\+|00)/, '');
}
export function validPhone(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const compact = value.trim().replace(/[\s().-]/g, '');
  // Only the declared local format and the unambiguous stored BF/NANP formats
  // may omit the international prefix. Do not guess where other numbers go.
  if (!/^(?:\+|00)/.test(compact) && !/^(?:\d{8}|226\d{8}|1\d{10})$/.test(compact)) return false;
  const digits = normalizePhone(value);
  return /^[1-9]\d{7,14}$/.test(digits) && (!digits.startsWith('226') || digits.length === 11)
    && (!digits.startsWith('1') || digits.length === 11);
}
export type SaleInput = { eventId: string; typeId: string; buyerName: string; phone: string; seller: string; token: string };
export function validateSale(input: SaleInput) {
  if (!input || !isUuid(input.eventId) || !isUuid(input.typeId)) return 'Sélectionnez un type de billet valide.';
  if (typeof input.buyerName !== 'string' || !input.buyerName.trim() || input.buyerName.trim().length > 200) return 'Indiquez le nom de l’acheteur (200 caractères maximum).';
  if (!validPhone(input.phone)) return phoneHint;
  if (typeof input.token !== 'string' || !/^[a-f0-9]{64}$/.test(input.token)) return 'Rechargez le formulaire avant de réessayer.';
  return null;
}
