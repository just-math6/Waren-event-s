-- Event workspaces. Raw ticket data and cash declarations stay private.
create table waren_access.virtual_sales (
  request_id uuid not null, operator uuid not null, ticket_id uuid not null unique references public.tickets on delete cascade,
  primary key(operator,request_id)
);
create table waren_access.cash_counts (
  id bigint generated always as identity primary key, event_id uuid not null references public.events on delete cascade,
  seller text not null, counted numeric not null check(counted>=0), expected numeric not null,
  note text not null, operator uuid not null, recorded_at timestamptz not null default now()
);
create index on waren_access.cash_counts(event_id,seller,id desc);
alter table waren_access.cash_counts enable row level security;
alter table waren_access.virtual_sales enable row level security;
revoke all on waren_access.virtual_sales,waren_access.cash_counts from public,anon,authenticated;

create function waren_access.can_work(e uuid,r text) returns boolean language sql stable set search_path='' as $$
 select auth.uid() is not null and (coalesce(public.waren_role(),'') in ('admin',r) or waren_access.has_role(e,r) or waren_access.has_role(e,'coordination'))
$$;
revoke all on function waren_access.can_work(uuid,text) from public,anon,authenticated;

create function public.waren_sales_catalog(p_event uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not waren_access.can_work(p_event,'vente') then raise insufficient_privilege; end if;
 return coalesce((select jsonb_agg(to_jsonb(x) order by x.price,x.id) from (
  select t.id,t.name,t.price,greatest(0,t.quantity_total-(select count(*) from public.tickets k where k.ticket_type_id=t.id and k.status<>'annule')
   -(select count(*) from public.paper_stock s where s.type_id=t.id and s.state='pret')) available
  from public.ticket_types t where t.event_id=p_event) x),'[]');
end $$;

create function public.waren_sell_virtual(p_event uuid,p_type uuid,p_name text,p_phone text,p_request uuid) returns text language plpgsql security definer set search_path='' as $$
declare k public.tickets; tt public.ticket_types;
begin
 if not waren_access.can_work(p_event,'vente') then raise insufficient_privilege; end if;
 if p_request is null or coalesce(length(trim(p_name)),0) not between 1 and 200 or coalesce(p_phone,'') !~ '^[1-9][0-9]{7,14}$' then raise exception 'Contact invalide'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request::text,0));
 select t.* into k from waren_access.virtual_sales v join public.tickets t on t.id=v.ticket_id where v.operator=auth.uid() and v.request_id=p_request;
 if found then
  if k.event_id=p_event and k.ticket_type_id=p_type and k.buyer_name=trim(p_name) and k.buyer_phone=p_phone and k.status<>'annule' then return k.token; end if;
  raise exception 'Cette confirmation a déjà servi.';
 end if;
 select * into tt from public.ticket_types where id=p_type and event_id=p_event for update;
 if not found then raise exception 'Catégorie introuvable'; end if;
 insert into public.tickets(event_id,ticket_type_id,buyer_name,buyer_phone,price_paid,sold_by,token) values(p_event,tt.id,trim(p_name),p_phone,tt.price,waren_access.operator_label(p_event),replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','')) returning * into k;
 insert into waren_access.virtual_sales values(p_request,auth.uid(),k.id); return k.token;
end $$;

create function public.waren_my_sales(p_event uuid,p_before timestamptz default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not waren_access.can_work(p_event,'vente') then raise insufficient_privilege; end if;
 return coalesce((select jsonb_agg(to_jsonb(x) order by x.sold_at desc,x.id) from (
  select k.id,k.sold_at,k.status,t.name,k.price_paid,case when v.ticket_id is null then 'Papier' else 'Virtuel' end channel,
   case when v.ticket_id is not null and k.status<>'annule' then k.token end token,
   case when v.ticket_id is not null then k.buyer_phone end phone,k.buyer_name buyer
  from public.tickets k join public.ticket_types t on t.id=k.ticket_type_id
  left join waren_access.virtual_sales v on v.ticket_id=k.id and v.operator=auth.uid()
  left join public.paper_stock s on s.token=k.token and s.seller=auth.uid()
  where k.event_id=p_event and (v.ticket_id is not null or s.token is not null) and (p_before is null or k.sold_at<p_before)
  order by k.sold_at desc,k.id limit 100) x),'[]');
end $$;

create function public.waren_gate_count(p_event uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not waren_access.can_work(p_event,'entree') then raise insufficient_privilege; end if;
 return (select jsonb_build_object('sold',count(*),'used',count(*) filter(where status='utilise')) from public.tickets where event_id=p_event and status<>'annule');
end $$;

create function public.waren_gate_detail(p_event uuid,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare outp jsonb; extra jsonb;
begin
 outp:=public.waren_gate(p_event,p_key);
 if outp->>'outcome' in ('accepted','utilise','annule') then
  select jsonb_build_object('type',tt.name,'channel',case when s.token is null then 'Virtuel' else 'Papier' end,'at',k.used_at)
  into extra from public.tickets k join public.ticket_types tt on tt.id=k.ticket_type_id left join public.paper_stock s on s.token=k.token
  where k.event_id=p_event and (k.token=p_key or s.code=upper(p_key));
 end if;
 return outp||coalesce(extra,'{}'::jsonb);
end $$;

create function public.waren_cash_counts(p_event uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not waren_access.has_role(p_event,'coordination') then raise insufficient_privilege; end if;
 return coalesce((select jsonb_agg(to_jsonb(x)) from (select distinct on(seller) seller,counted,note,expected,recorded_at from waren_access.cash_counts where event_id=p_event order by seller,id desc) x),'[]');
end $$;
create function public.waren_count_cash(p_event uuid,p_seller text,p_amount numeric,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare amount numeric;
begin
 if not waren_access.has_role(p_event,'coordination') then raise insufficient_privilege; end if;
 select sum(k.price_paid) into amount from public.tickets k where k.event_id=p_event and k.status<>'annule' and coalesce(nullif(btrim(k.sold_by),''),'Vendeur non renseigné')=p_seller;
 if amount is null or p_amount is null or p_amount<0 or p_amount>999999999999 or trunc(p_amount)<>p_amount or length(coalesce(p_note,''))>500 then raise exception 'Remise invalide'; end if;
 if p_amount<>amount and coalesce(trim(p_note),'')='' then raise exception 'Indiquez le motif de l’écart'; end if;
 insert into waren_access.cash_counts(event_id,seller,counted,expected,note,operator) values(p_event,p_seller,p_amount,amount,trim(coalesce(p_note,'')),auth.uid());
end $$;
revoke all on function public.waren_sales_catalog(uuid),public.waren_sell_virtual(uuid,uuid,text,text,uuid),public.waren_my_sales(uuid,timestamptz),public.waren_gate_count(uuid),public.waren_gate_detail(uuid,text),public.waren_cash_counts(uuid),public.waren_count_cash(uuid,text,numeric,text) from public,anon;
grant execute on function public.waren_sales_catalog(uuid),public.waren_sell_virtual(uuid,uuid,text,text,uuid),public.waren_my_sales(uuid,timestamptz),public.waren_gate_count(uuid),public.waren_gate_detail(uuid,text),public.waren_cash_counts(uuid),public.waren_count_cash(uuid,text,numeric,text) to authenticated;
