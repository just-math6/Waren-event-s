create table public.ticket_staff (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null, role text not null check(role in ('vente','entree')),
 check(user_id <> 'd04b977b-cf36-43ec-b202-25b785312ac5')
);
create table public.paper_stock (
 token text primary key default replace(gen_random_uuid()::text,'-',''),
 code text not null unique default upper(left(replace(gen_random_uuid()::text,'-',''),12)),
 batch uuid not null, type_id uuid not null references public.ticket_types(id) on delete cascade,
 price numeric not null, state text not null default 'pret' check(state in ('pret','vendu','bloque')),
 sale uuid, seller uuid, created_at timestamptz not null default now()
);
create index on public.paper_stock(type_id,state);
create index on public.paper_stock(batch);
alter table public.ticket_staff enable row level security;
alter table public.paper_stock enable row level security;
revoke all on public.ticket_staff,public.paper_stock from public,anon,authenticated;
grant select,delete on public.ticket_staff to authenticated;
grant select on public.paper_stock to authenticated;
create policy staff_admin on public.ticket_staff to authenticated using(auth.uid()='d04b977b-cf36-43ec-b202-25b785312ac5');
create policy stock_admin on public.paper_stock for select to authenticated using(auth.uid()='d04b977b-cf36-43ec-b202-25b785312ac5');
create function public.waren_role() returns text language sql stable security definer set search_path='' as $$
 select case when auth.uid()='d04b977b-cf36-43ec-b202-25b785312ac5' then 'admin'
 else (select role from public.ticket_staff where user_id=auth.uid()) end
$$;
create function public.waren_assign(p_email text,p_role text) returns void language plpgsql security definer set search_path='' as $$
declare u auth.users;
begin
 if public.waren_role() is distinct from 'admin' then raise exception 'Accès refusé'; end if;
 select * into u from auth.users where lower(email)=lower(trim(p_email)) and email_confirmed_at is not null and not coalesce(is_anonymous,false);
 if u.id is null then raise exception 'Ce compte doit d’abord être créé et son courriel confirmé.'; end if;
 insert into public.ticket_staff values(u.id,u.email,p_role) on conflict(user_id) do update set role=excluded.role,email=excluded.email;
end $$;
create policy staff_event_labels on public.events for select to authenticated using ((select public.waren_role()) in ('vente','entree'));
-- Protect reserved paper inventory against legacy cash sales as well.
create or replace function public.check_ticket_quantity() returns trigger language plpgsql set search_path='' as $$
declare capacity integer;
begin
 select quantity_total into capacity from public.ticket_types where id=new.ticket_type_id for update;
 if (select count(*) from public.tickets where ticket_type_id=new.ticket_type_id and status<>'annule') +
 (select count(*) from public.paper_stock where type_id=new.ticket_type_id and state='pret') >= capacity then
 raise exception 'Plus de billets disponibles pour ce type de billet'; end if;
 return new;
end $$;
create function public.waren_print(p_type uuid,p_count int) returns uuid language plpgsql security definer set search_path='' as $$
declare t public.ticket_types; b uuid:=gen_random_uuid();
begin
 if public.waren_role() is distinct from 'admin' then raise exception 'Accès refusé'; end if;
 select * into strict t from public.ticket_types where id=p_type for update;
 if p_count is null or p_count not between 1 and 100 or p_count +
 (select count(*) from public.paper_stock where type_id=t.id and state='pret') +
 (select count(*) from public.tickets where ticket_type_id=t.id and status<>'annule') > t.quantity_total then raise exception 'Quantité indisponible (maximum 100 par lot).'; end if;
 insert into public.paper_stock(batch,type_id,price) select b,t.id,t.price from generate_series(1,p_count);
 return b;
end $$;
create function public.waren_block(p_batch uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if public.waren_role() is distinct from 'admin' then raise exception 'Accès refusé'; end if;
 update public.paper_stock set state='bloque' where batch=p_batch and state='pret';
end $$;
create function public.waren_quote(p_event uuid,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare row jsonb;
begin
 if coalesce(public.waren_role(),'') not in ('vente','admin') then raise exception 'Accès refusé'; end if;
 select jsonb_build_object('code',s.code,'name',t.name,'price',s.price) into row from public.paper_stock s join public.ticket_types t on t.id=s.type_id
 where t.event_id=p_event and s.state='pret' and (s.token=p_key or s.code=upper(p_key));
 if row is null then raise exception 'Billet inconnu, bloqué ou déjà vendu pour cet événement.'; end if;
 return row;
end $$;
alter table public.tickets alter column buyer_phone drop not null;
create function public.waren_sell(p_event uuid,p_codes text[],p_sale uuid) returns int language plpgsql security definer set search_path='' as $$
declare s record; n integer:=0; who text;
begin
 if coalesce(public.waren_role(),'') not in ('vente','admin') then raise exception 'Accès refusé'; end if;
 if p_sale is null or coalesce(cardinality(p_codes),0) not between 1 and 50 or cardinality(p_codes)<>(select count(distinct c) from unnest(p_codes) c) then raise exception 'Panier invalide'; end if;
 select email into who from auth.users where id=auth.uid();
 for s in select p.* from public.paper_stock p join public.ticket_types t on t.id=p.type_id where t.event_id=p_event and p.code=any(p_codes) order by t.id,p.code for update of t,p loop
 if s.state='vendu' and s.sale=p_sale and s.seller=auth.uid() then n:=n+1; continue; end if;
 if s.state<>'pret' then raise exception 'Un billet est déjà vendu ou bloqué. Vente non enregistrée.'; end if;
 update public.paper_stock set state='vendu',sale=p_sale,seller=auth.uid() where code=s.code;
 insert into public.tickets(event_id,ticket_type_id,token,buyer_name,buyer_phone,price_paid,sold_by)
 values(p_event,s.type_id,s.token,'Billet '||s.code,null,s.price,who);
 n:=n+1;
 end loop;
 if n<>cardinality(p_codes) then raise exception 'Billet inconnu. Vente non enregistrée.'; end if;
 return n;
end $$;
create function public.waren_gate(p_event uuid,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.paper_stock; t public.tickets;
begin
 if coalesce(public.waren_role(),'') not in ('entree','admin') then raise exception 'Accès refusé'; end if;
 select p.* into s from public.paper_stock p join public.ticket_types tt on tt.id=p.type_id where tt.event_id=p_event and (p.token=p_key or p.code=upper(p_key));
 if s.state in ('pret','bloque') then return jsonb_build_object('outcome',s.state); end if;
 select * into t from public.tickets where event_id=p_event and token=coalesce(s.token,p_key) for update;
 if t.id is null then return jsonb_build_object('outcome','missing'); end if;
 if t.status<>'valide' then return jsonb_build_object('outcome',t.status,'at',t.used_at); end if;
 update public.tickets set status='utilise',used_at=clock_timestamp() where id=t.id;
 return jsonb_build_object('outcome','accepted');
end $$;
revoke all on function public.waren_role(),public.waren_assign(text,text),public.waren_print(uuid,int),public.waren_block(uuid),public.waren_quote(uuid,text),public.waren_sell(uuid,text[],uuid),public.waren_gate(uuid,text) from public,anon;
grant execute on function public.waren_role(),public.waren_assign(text,text),public.waren_print(uuid,int),public.waren_block(uuid),public.waren_quote(uuid,text),public.waren_sell(uuid,text[],uuid),public.waren_gate(uuid,text) to authenticated;
create function public.waren_batches(p_event uuid) returns table(batch uuid, name text, created_at timestamptz, total bigint, ready bigint)
language sql stable security invoker set search_path='' as $$
 select s.batch,t.name,min(s.created_at),count(*),count(*) filter(where s.state='pret') from public.paper_stock s
 join public.ticket_types t on t.id=s.type_id where t.event_id=p_event group by s.batch,t.name order by min(s.created_at) desc
$$;
revoke all on function public.waren_batches(uuid) from public,anon;
grant execute on function public.waren_batches(uuid) to authenticated;
