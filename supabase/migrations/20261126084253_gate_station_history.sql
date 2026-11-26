-- The journal deliberately stores neither QR tokens nor manual ticket codes.
create table waren_access.gate_journal (
 id bigint generated always as identity primary key,
 event_id uuid not null references public.events(id) on delete cascade,
 operator uuid not null,
 scanned_at timestamptz not null default clock_timestamp(),
 detail jsonb not null
);
create index gate_journal_operator on waren_access.gate_journal(event_id,operator,id desc);
alter table waren_access.gate_journal enable row level security;
revoke all on waren_access.gate_journal from public,anon,authenticated;

create or replace function public.waren_gate_detail(p_event uuid,p_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d jsonb; extra jsonb; stamp timestamptz; entry_id bigint;
begin
 if not waren_access.can_work(p_event,'entree') then raise insufficient_privilege; end if;
 d:=public.waren_gate(p_event,p_key);
 if d->>'outcome' in ('accepted','utilise','annule') then
  select jsonb_build_object('type',tt.name,'channel',case when s.token is null then 'Virtuel' else 'Papier' end,'at',k.used_at)
  into extra from public.tickets k join public.ticket_types tt on tt.id=k.ticket_type_id left join public.paper_stock s on s.token=k.token
  where k.event_id=p_event and (k.token=p_key or s.code=upper(p_key));
 end if;
 d:=d||coalesce(extra,'{}'::jsonb);
 insert into waren_access.gate_journal(event_id,operator,detail) values(p_event,auth.uid(),d)
 returning id,scanned_at into entry_id,stamp;
 return d||jsonb_build_object('id',entry_id::text,'scanned_at',stamp);
end $$;

create function public.waren_gate_station(p_event uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare label text; recent jsonb;
begin
 if not waren_access.can_work(p_event,'entree') then raise insufficient_privilege; end if;
 label:=waren_access.operator_label(p_event);
 select coalesce(jsonb_agg(j.detail||jsonb_build_object('id',j.id::text,'scanned_at',j.scanned_at) order by j.id desc),'[]'::jsonb)
 into recent from (select id,scanned_at,detail from waren_access.gate_journal where event_id=p_event and operator=auth.uid() order by id desc limit 40) j;
 return public.waren_gate_count(p_event)||jsonb_build_object('operator',case when position('@' in label)=0 then label end,'history',recent);
end $$;
revoke all on function public.waren_gate_station(uuid),public.waren_gate_detail(uuid,text) from public,anon;
grant execute on function public.waren_gate_station(uuid),public.waren_gate_detail(uuid,text) to authenticated;
