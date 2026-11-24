'use server';
import { revalidatePath } from 'next/cache';
import { isUuid } from '@/lib/sale-input';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { validateEvent, type EventInput } from '@/lib/event-input';
export async function createEvent(input: EventInput): Promise<{ error?: string; success?: boolean }> {
  await requireAdmin();
  const error = validateEvent(input);
  if (error) return { error };
  const supabase = await createClient();
  const { error: databaseError } = await supabase.rpc('create_event_with_ticket_types', {
    p_title: input.title.trim(), p_location: input.location.trim(), p_starts_at: input.startsAt,
    p_ticket_types: input.ticketTypes.map(t => ({ name: t.name.trim(), price: t.price.replace(',', '.'), quantity_total: Number(t.quantity) })),
  });
  if (databaseError) return { error: 'Enregistrement impossible. Aucun événement n’a été créé. Veuillez réessayer.' };
  revalidatePath('/admin/evenements');
  return { success: true };
}

export async function deleteEvent(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  if (!isUuid(id)) return { error: 'Événement inconnu.' };
  const db = await createClient();
  const { data, error } = await db.from('events').delete().eq('id', id).select('id').maybeSingle();
  if (error) return { error: 'Suppression impossible. Réessayez.' };
  if (!data) return { error: 'Cet événement est introuvable. Actualisez la liste.' };
  revalidatePath('/admin/evenements');
  revalidatePath('/equipe');
  return {};
}
