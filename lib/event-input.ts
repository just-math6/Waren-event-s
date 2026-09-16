export type EventInput = { title: string; location: string; startsAt: string; ticketTypes: { name: string; price: string; quantity: string }[] };
export function validateEvent(input: EventInput) {
  if (!input || typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 200) return 'Le titre est obligatoire (200 caractères maximum).';
  if (typeof input.location !== 'string' || !input.location.trim() || input.location.trim().length > 300) return 'Le lieu est obligatoire (300 caractères maximum).';
  if (typeof input.startsAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(input.startsAt) || !Number.isFinite(Date.parse(input.startsAt))) return 'Indiquez une date et une heure valides.';
  if (!Array.isArray(input.ticketTypes) || input.ticketTypes.length < 1 || input.ticketTypes.length > 50) return 'Ajoutez entre 1 et 50 types de billets.';
  const names = new Set<string>();
  for (const type of input.ticketTypes) {
    if (!type || typeof type.name !== 'string' || !type.name.trim() || type.name.trim().length > 100) return 'Chaque type doit avoir un nom (100 caractères maximum).';
    const name = type.name.trim().toLocaleLowerCase('fr');
    if (names.has(name)) return 'Les noms des types de billets doivent être différents.';
    names.add(name);
    if (typeof type.price !== 'string' || !/^\d{1,8}([.,]\d{1,2})?$/.test(type.price)) return 'Le prix doit être positif ou nul, avec au plus deux décimales.';
    if (typeof type.quantity !== 'string' || !/^\d{1,10}$/.test(type.quantity) || Number(type.quantity) < 1 || Number(type.quantity) > 2147483647) return 'La quantité doit être un entier entre 1 et 2 147 483 647.';
  }
  return null;
}
