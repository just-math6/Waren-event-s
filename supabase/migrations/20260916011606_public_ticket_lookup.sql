create schema ticket_private;
revoke all on schema ticket_private from public;
grant usage on schema ticket_private to anon, authenticated;

-- Public bearer-link access is intentional: the exact random token is the credential.
-- No auth.uid() requirement because buyers have no account.
create function ticket_private.read_ticket(p_token text)
returns jsonb language sql stable security definer set search_path = ''
as $$
 select jsonb_build_object(
 'ticket_type', tt.name, 'event_title', e.title, 'starts_at', e.starts_at,
 'location', e.location, 'status', t.status,
 'buyer_name', t.buyer_name, 'buyer_phone', t.buyer_phone)
 from public.tickets t
 join public.events e on e.id = t.event_id
 join public.ticket_types tt on tt.id = t.ticket_type_id and tt.event_id = e.id
 where p_token ~ '^([a-f0-9]{32}|[a-f0-9]{64})$' and t.token = p_token
 limit 1;
$$;
revoke all on function ticket_private.read_ticket(text) from public;
grant execute on function ticket_private.read_ticket(text) to anon, authenticated;

create function public.get_public_ticket(p_token text)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select ticket_private.read_ticket(p_token); $$;
revoke all on function public.get_public_ticket(text) from public;
grant execute on function public.get_public_ticket(text) to anon, authenticated;
