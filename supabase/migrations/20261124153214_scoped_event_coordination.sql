-- Event-level rights are separate from the historical, application-wide staff roles.
create schema if not exists waren_access;
revoke all on schema waren_access from public, anon, authenticated;
create table waren_access.event_staff (
 event_id uuid not null references public.events(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('coordination','vente','entree')),
 primary key(event_id,user_id)
);
create unique index event_one_coordinator on waren_access.event_staff(event_id) where role='coordination';
create index event_staff_member on waren_access.event_staff(user_id,event_id);
alter table waren_access.event_staff enable row level security;
revoke all on waren_access.event_staff from public,anon,authenticated;

create function waren_access.has_role(e uuid,r text) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from waren_access.event_staff where event_id=e and user_id=(select auth.uid()) and role=r)
$$;
revoke all on function waren_access.has_role(uuid,text) from public, anon, authenticated;

create function public.waren_my_assignments() returns table(id uuid,title text,starts_at timestamptz,role text)
language sql stable security definer set search_path='' as $$
 select e.id,e.title,e.starts_at,s.role from waren_access.event_staff s join public.events e on e.id=s.event_id
 where s.user_id=(select auth.uid()) order by e.starts_at desc,e.id
$$;

create function public.waren_coord_dashboard(p_event uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not waren_access.has_role(p_event,'coordination') then raise exception 'Accès refusé' using errcode='42501'; end if;
 select jsonb_build_object(
  'title',e.title, 'starts_at',e.starts_at, 'location',e.location,
  'types',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'price',t.price,'quantity',t.quantity_total) order by t.price,t.id) from public.ticket_types t where t.event_id=e.id),'[]'::jsonb),
  'sales',coalesce((select jsonb_agg(to_jsonb(x) order by x.seller,x.name,x.type_id) from (
    select coalesce(nullif(btrim(k.sold_by),''),'Vendeur non renseigné') seller,t.id type_id,t.name,count(*) sold,
    count(*) filter(where k.status='utilise') used,sum(k.price_paid) revenue
    from public.tickets k join public.ticket_types t on t.id=k.ticket_type_id and t.event_id=k.event_id
    where k.event_id=e.id and k.status<>'annule' group by 1,2,3) x),'[]'::jsonb),
  'staff',coalesce((select jsonb_agg(jsonb_build_object('id',s.user_id,'email',u.email,'role',s.role) order by u.email)
    from waren_access.event_staff s join auth.users u on u.id=s.user_id where s.event_id=e.id and s.role<>'coordination'),'[]'::jsonb)
 ) into result from public.events e where e.id=p_event;
 return result;
end $$;

create function public.waren_coord_quantity(p_event uuid,p_type uuid,p_count integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from waren_access.event_staff where event_id=p_event and user_id=auth.uid() and role='coordination' for share;
 if not found then raise exception 'Accès refusé' using errcode='42501'; end if;
 perform 1 from public.ticket_types where id=p_type and event_id=p_event for update;
 if not found or p_count is null or p_count<1 then raise exception 'Quantité ou catégorie invalide'; end if;
 if p_count < (select count(*) from public.tickets where event_id=p_event and ticket_type_id=p_type and status<>'annule')
   +(select count(*) from public.paper_stock where type_id=p_type and state='pret') then
   raise exception 'La quantité doit couvrir les billets vendus et les billets papier déjà préparés.'; end if;
 update public.ticket_types set quantity_total=p_count where id=p_type and event_id=p_event;
end $$;

create function public.waren_coord_team(p_event uuid,p_email text,p_role text) returns void
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 perform 1 from waren_access.event_staff where event_id=p_event and user_id=auth.uid() and role='coordination' for share;
 if not found then raise exception 'Accès refusé' using errcode='42501'; end if;
 if p_role is null or p_role not in ('vente','entree','retirer') then raise exception 'Rôle invalide'; end if;
 select id into target from auth.users where lower(email)=lower(btrim(p_email)) and email_confirmed_at is not null and is_anonymous is not true;
 if target is null or target=auth.uid() or target='d04b977b-cf36-43ec-b202-25b785312ac5' then raise exception 'Compte indisponible : utilisez le courriel confirmé d’un membre de votre équipe.'; end if;
 if p_role='retirer' then delete from waren_access.event_staff where event_id=p_event and user_id=target and role<>'coordination'; return; end if;
 insert into waren_access.event_staff(event_id,user_id,role) values(p_event,target,p_role)
 on conflict(event_id,user_id) do update set role=excluded.role where waren_access.event_staff.role<>'coordination';
end $$;

create function public.waren_name_coordinator(p_event uuid,p_email text) returns void
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if public.waren_role() is distinct from 'admin' then raise exception 'Accès refusé' using errcode='42501'; end if;
 select id into target from auth.users where lower(email)=lower(btrim(p_email)) and email_confirmed_at is not null and is_anonymous is not true;
 if target is null or target=auth.uid() then raise exception 'Choisissez un autre compte confirmé.'; end if;
 -- A nomination never silently replaces the current coordinator.
 insert into waren_access.event_staff(event_id,user_id,role) values(p_event,target,'coordination')
 on conflict(event_id,user_id) do update set role='coordination';
end $$;

revoke all on function public.waren_my_assignments(),public.waren_coord_dashboard(uuid),public.waren_coord_quantity(uuid,uuid,integer),public.waren_coord_team(uuid,text,text),public.waren_name_coordinator(uuid,text) from public,anon;
grant execute on function public.waren_my_assignments(),public.waren_coord_dashboard(uuid),public.waren_coord_quantity(uuid,uuid,integer),public.waren_coord_team(uuid,text,text),public.waren_name_coordinator(uuid,text) to authenticated;

create or replace function public.waren_quote(p_event uuid,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare row jsonb;
begin
 if coalesce(public.waren_role(),'') not in ('vente','admin') and not waren_access.has_role(p_event,'vente') then raise exception 'Accès refusé'; end if;
 select jsonb_build_object('code',s.code,'name',t.name,'price',s.price) into row from public.paper_stock s join public.ticket_types t on t.id=s.type_id
 where t.event_id=p_event and s.state='pret' and (s.token=p_key or s.code=upper(p_key));
 if row is null then raise exception 'Billet inconnu, bloqué ou déjà vendu pour cet événement.'; end if;
 return row;
end $$;

create or replace function public.waren_sell(p_event uuid,p_codes text[],p_sale uuid) returns int language plpgsql security definer set search_path='' as $$
declare s record; n integer:=0; who text;
begin
 if coalesce(public.waren_role(),'') not in ('vente','admin') and not waren_access.has_role(p_event,'vente') then raise exception 'Accès refusé'; end if;
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

create or replace function public.waren_gate(p_event uuid,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.paper_stock; t public.tickets;
begin
 if coalesce(public.waren_role(),'') not in ('entree','admin') and not waren_access.has_role(p_event,'entree') then raise exception 'Accès refusé'; end if;
 select p.* into s from public.paper_stock p join public.ticket_types tt on tt.id=p.type_id where tt.event_id=p_event and (p.token=p_key or p.code=upper(p_key));
 if s.state in ('pret','bloque') then return jsonb_build_object('outcome',s.state); end if;
 select * into t from public.tickets where event_id=p_event and token=coalesce(s.token,p_key) for update;
 if t.id is null then return jsonb_build_object('outcome','missing'); end if;
 if t.status<>'valide' then return jsonb_build_object('outcome',t.status,'at',t.used_at,'sold_by',nullif(btrim(t.sold_by),'')); end if;
 update public.tickets set status='utilise',used_at=clock_timestamp() where id=t.id;
 return jsonb_build_object('outcome','accepted','sold_by',nullif(btrim(t.sold_by),''));
end $$;
