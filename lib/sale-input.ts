export const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function normalizePhone(value: string) {
  return value.trim().replace(/[\s()+.-]/g, '').replace(/^00/, '');
}
export function validPhone(value: unknown): value is string {
  return typeof value === 'string' && /^[+\d\s().-]+$/.test(value) && /^[1-9]\d{7,14}$/.test(normalizePhone(value));
}
export type SaleInput = { eventId: string; typeId: string; buyerName: string; phone: string; seller: string; token: string };
export function validateSale(input: SaleInput) {
  if (!input || !isUuid(input.eventId) || !isUuid(input.typeId)) return 'Sélectionnez un type de billet valide.';
  if (typeof input.buyerName !== 'string' || !input.buyerName.trim() || input.buyerName.trim().length > 200) return 'Indiquez le nom de l’acheteur (200 caractères maximum).';
  if (!validPhone(input.phone)) return 'Indiquez un numéro avec son indicatif pays, de 8 à 15 chiffres.';
  if (typeof input.token !== 'string' || !/^[a-f0-9]{64}$/.test(input.token)) return 'Rechargez le formulaire avant de réessayer.';
  return null;
}
export function whatsappLink(phone: string, name: string, link: string) {
  const firstName = name.trim().split(/\s+/)[0];
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(`Bonjour ${firstName}, voici votre billet : ${link}`)}`;
}
