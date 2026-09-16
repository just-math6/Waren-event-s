'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { sellerNames } from '@/lib/sellers';
import { isUuid, normalizePhone, validPhone, validateSale, type SaleInput } from '@/lib/sale-input';
export async function checkPhone(eventId: string, phone: string): Promise<{ exists?: boolean; error?: string }> {
  await requireAdmin();
  if (!isUuid(eventId) || !validPhone(phone)) return {};
  const supabase = await createClient();
  // Compare legacy formatted numbers too, without sending buyer data to the browser.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('tickets').select('buyer_phone').eq('event_id', eventId).eq('status', 'valide').order('id').range(offset, offset + 499);
    if (error) return { error: 'Vérification des doublons indisponible.' };
    if (data.some(row => normalizePhone(row.buyer_phone) === normalizePhone(phone))) return { exists: true };
    if (data.length < 500) return { exists: false };
  }
}
export async function confirmSale(input: SaleInput): Promise<{ token?: string; error?: string }> {
  const user = await requireAdmin();
  const error = validateSale(input);
  if (error) return { error };
  if (!sellerNames(user.email).includes(input.seller)) return { error: 'Sélectionnez un vendeur valide.' };
  const supabase = await createClient();
  // The cryptographically random form token also makes retries after a lost response idempotent.
  const { data: existing, error: lookupError } = await supabase.from('tickets').select('token,event_id,ticket_type_id,buyer_name,buyer_phone,sold_by').eq('token', input.token).maybeSingle();
  if (lookupError) return { error: 'Impossible de vérifier la vente. Réessayez.' };
  if (existing) {
    if (existing.event_id === input.eventId && existing.ticket_type_id === input.typeId && existing.buyer_name === input.buyerName.trim() && existing.buyer_phone === normalizePhone(input.phone) && existing.sold_by === input.seller) return { token: existing.token };
    return { error: 'Ce formulaire a déjà servi. Rechargez la page pour une nouvelle vente.' };
  }
  const { data: type, error: typeError } = await supabase.from('ticket_types').select('id,price').eq('id', input.typeId).eq('event_id', input.eventId).maybeSingle();
  if (typeError || !type) return { error: 'Ce type de billet n’est plus disponible pour cet événement.' };
  const { error: insertError } = await supabase.from('tickets').insert({ token: input.token, event_id: input.eventId, ticket_type_id: type.id, buyer_name: input.buyerName.trim(), buyer_phone: normalizePhone(input.phone), sold_by: input.seller, price_paid: type.price, status: 'valide' });
  if (insertError) {
    if (insertError.message.includes('Plus de billets disponibles')) return { error: 'Plus de billets disponibles pour ce type de billet. Choisissez un autre type.' };
    return { error: 'La vente n’a pas été confirmée. Réessayez avec ce formulaire.' };
  }
  revalidatePath('/admin/evenements');
  revalidatePath(`/admin/evenements/${input.eventId}/vendre`);
  return { token: input.token };
}
