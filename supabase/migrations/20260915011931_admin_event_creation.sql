-- Applies after the original events/ticket_types/tickets schema.
-- This UUID is the existing administrator in this Supabase project.
alter policy admin_full_access_events on public.events to authenticated
using ((select auth.uid()) = 'd04b977b-cf36-43ec-b202-25b785312ac5'::uuid)
with check ((select auth.uid()) = 'd04b977b-cf36-43ec-b202-25b785312ac5'::uuid);
alter policy admin_full_access_ticket_types on public.ticket_types to authenticated
using ((select auth.uid()) = 'd04b977b-cf36-43ec-b202-25b785312ac5'::uuid)
with check ((select auth.uid()) = 'd04b977b-cf36-43ec-b202-25b785312ac5'::uuid);
alter policy admin_full_access_tickets on public.tickets to authenticated
using ((select auth.uid()) = 'd04b977b-cf36-43ec-b202-25b785312ac5'::uuid)
with check ((select auth.uid()) = 'd04b977b-cf36-43ec-b202-25b785312ac5'::uuid);
alter view public.event_summary set (security_invoker = true);
revoke all on public.event_summary from anon;
grant select on public.event_summary to authenticated;
grant select, insert on public.events, public.ticket_types to authenticated;
grant select on public.tickets to authenticated;

create function public.create_event_with_ticket_types(
  p_title text, p_location text, p_starts_at timestamptz, p_ticket_types jsonb
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  event_id uuid;
  item jsonb;
  names text[] := array[]::text[];
  ticket_name text;
begin
  if auth.uid() is distinct from 'd04b977b-cf36-43ec-b202-25b785312ac5'::uuid then
    raise exception 'Accès administrateur requis' using errcode = '42501';
  end if;
  if p_title is null or length(btrim(p_title)) not between 1 and 200
    or p_location is null or length(btrim(p_location)) not between 1 and 300
    or p_starts_at is null or not isfinite(p_starts_at) then
    raise exception 'Événement invalide' using errcode = '22023';
  end if;
  if p_ticket_types is null or jsonb_typeof(p_ticket_types) <> 'array' then
    raise exception 'Types de billets requis' using errcode = '22023';
  end if;
  if jsonb_array_length(p_ticket_types) not between 1 and 50 then
    raise exception 'Entre 1 et 50 types requis' using errcode = '22023';
  end if;
  insert into public.events (organizer_id, title, location, starts_at)
  values (auth.uid(), btrim(p_title), btrim(p_location), p_starts_at) returning id into event_id;
  for item in select value from jsonb_array_elements(p_ticket_types) loop
    ticket_name := btrim(item->>'name');
    if ticket_name is null or length(ticket_name) not between 1 and 100
      or lower(ticket_name) = any(names)
      or item->>'price' is null or (item->>'price') !~ '^[0-9]{1,8}(\.[0-9]{1,2})?$'
      or item->>'quantity_total' is null or (item->>'quantity_total') !~ '^[0-9]{1,10}$' then
      raise exception 'Type de billet invalide' using errcode = '22023';
    end if;
    if (item->>'quantity_total')::numeric not between 1 and 2147483647 then
      raise exception 'Quantité invalide' using errcode = '22023';
    end if;
    names := array_append(names, lower(ticket_name));
    insert into public.ticket_types (event_id, name, price, quantity_total)
    values (event_id, ticket_name, (item->>'price')::numeric, (item->>'quantity_total')::integer);
  end loop;
  return event_id;
end;
$$;
revoke all on function public.create_event_with_ticket_types(text,text,timestamptz,jsonb) from public, anon;
grant execute on function public.create_event_with_ticket_types(text,text,timestamptz,jsonb) to authenticated;
