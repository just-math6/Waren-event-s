alter table public.events add column ticket_art text check (ticket_art in ('football-two-2026'));
create function public.create_football_event(p_location text,p_starts_at timestamptz,p_ticket_types jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare eid uuid;
begin
 if auth.uid() is distinct from 'd04b977b-cf36-43ec-b202-25b785312ac5'::uuid then raise exception 'Accès refusé'; end if;
 if jsonb_array_length(p_ticket_types)<>3 or
 (select count(distinct value->>'name') from jsonb_array_elements(p_ticket_types)
 where (value->>'name',(value->>'price')::numeric) in (('Standard',500),('VIP',1500),('VVIP',2000)))<>3 then raise exception 'Tarifs incompatibles'; end if;
 eid:=public.create_event_with_ticket_types('Football Tournament Two',p_location,p_starts_at,p_ticket_types);
 update public.events set ticket_art='football-two-2026' where id=eid;
 return eid;
end $$;
revoke all on function public.create_football_event(text,timestamptz,jsonb) from public,anon;
grant execute on function public.create_football_event(text,timestamptz,jsonb) to authenticated;
