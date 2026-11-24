create table waren_access.staff_names (
 user_id uuid primary key references auth.users(id) on delete cascade,
 event_id uuid not null references public.events(id) on delete cascade,
 display_name text not null,
 name_key text not null unique,
 login_address text not null unique
);
alter table waren_access.staff_names enable row level security;
revoke all on waren_access.staff_names from public,anon,authenticated;
create index staff_names_event_idx on waren_access.staff_names(event_id);

create function waren_access.clean_name(n text) returns text language sql immutable strict set search_path='' as $$
 select btrim(regexp_replace(normalize(n,NFKC),'[[:space:]]+',' ','g'))
$$;
create function waren_access.check_new_member(e uuid,c uuid,n text,r text) returns void language plpgsql set search_path='' as $$
begin
 perform 1 from waren_access.event_staff where event_id=e and user_id=c and role='coordination' for share;
 if not found then raise exception 'Accès refusé' using errcode='42501'; end if;
 if r is null or r not in ('vente','entree') or n is null or char_length(n) not between 2 and 60 or n ~ '[@[:cntrl:]]' then raise exception 'Nom ou rôle invalide' using errcode='22023'; end if;
 if exists(select 1 from waren_access.staff_names where name_key=lower(n)) then raise exception 'Nom déjà utilisé' using errcode='23505'; end if;
end $$;
create function public.waren_staff_preflight(p_event uuid,p_name text,p_role text) returns void language sql security definer set search_path='' as $$
 select waren_access.check_new_member(p_event,auth.uid(),waren_access.clean_name(p_name),p_role)
$$;
-- Only the official Auth Admin API can write this marker; public sign-up metadata cannot activate a role.
create function public.waren_activate_named(p_event uuid,p_user uuid) returns void language plpgsql security definer set search_path='' as $$
declare seed jsonb; addr text; n text; r text;
begin
 select u.raw_app_meta_data->'waren_staff_seed',u.email into seed,addr from auth.users u where u.id=p_user and u.email_confirmed_at is not null;
 if seed is null or (seed->>'creator')::uuid is distinct from auth.uid() or (seed->>'event')::uuid is distinct from p_event
    or addr !~ '^[a-f0-9-]{36}@staff[.]waren[.]invalid$' then raise exception 'Accès refusé' using errcode='42501'; end if;
 n:=waren_access.clean_name(seed->>'name'); r:=seed->>'role';
 perform waren_access.check_new_member(p_event,auth.uid(),n,r);
 insert into waren_access.staff_names values(p_user,p_event,n,lower(n),addr);
 insert into waren_access.event_staff(event_id,user_id,role) values(p_event,p_user,r);
end $$;
revoke all on function public.waren_activate_named(uuid,uuid) from public,anon;
grant execute on function public.waren_activate_named(uuid,uuid) to authenticated;

-- Managed passwords are owned by this event, never by an admin or a multi-event account.
create function waren_access.restrict_named_membership() returns trigger language plpgsql security definer set search_path='' as $$
declare origin text;
begin
 select u.raw_app_meta_data->'waren_staff_seed'->>'event' into origin from auth.users u where u.id=new.user_id;
 if origin is null then return new; end if;
 if tg_table_name='ticket_staff' then raise exception 'Compte réservé à son événement'; end if;
 if new.event_id is distinct from origin::uuid or new.role not in ('vente','entree') then raise exception 'Compte réservé à son événement'; end if;
 return new;
end $$;
create trigger restrict_named_event before insert or update on waren_access.event_staff for each row execute function waren_access.restrict_named_membership();
create trigger restrict_named_global before insert or update on public.ticket_staff for each row execute function waren_access.restrict_named_membership();

-- Never return personal email addresses. Unknown names yield an equally shaped internal address.
create function public.waren_staff_address(p_name text) returns text language sql stable security definer set search_path='' as $$
 with k as (select lower(waren_access.clean_name(left(p_name,256))) as n)
 select coalesce((select s.login_address from waren_access.staff_names s join waren_access.event_staff m using(event_id,user_id), k
  where s.name_key=k.n and m.role in ('vente','entree')),md5(coalesce((select n from k),''))::uuid::text||'@staff.waren.invalid')
$$;
create function public.waren_manage_member(p_event uuid,p_user uuid,p_action text) returns uuid language plpgsql security definer set search_path='' as $$
begin
 perform 1 from waren_access.event_staff where event_id=p_event and user_id=auth.uid() and role='coordination' for share;
 if not found then raise exception 'Accès refusé' using errcode='42501'; end if;
 perform 1 from waren_access.event_staff where event_id=p_event and user_id=p_user and role in ('vente','entree') for update;
 if not found then
   if p_action in ('vente','entree') and exists(select 1 from waren_access.staff_names where event_id=p_event and user_id=p_user) then
     insert into waren_access.event_staff(event_id,user_id,role) values(p_event,p_user,p_action); return p_user;
   end if;
   raise exception 'Membre introuvable';
 end if;
 if p_action='retirer' then delete from waren_access.event_staff where event_id=p_event and user_id=p_user;
 elsif p_action in ('vente','entree') then update waren_access.event_staff set role=p_action where event_id=p_event and user_id=p_user;
 elsif p_action='password' and exists(select 1 from waren_access.staff_names where event_id=p_event and user_id=p_user) then null;
 else raise exception 'Action refusée'; end if;
 return p_user;
end $$;
revoke all on all functions in schema waren_access from public, anon, authenticated;
revoke all on function public.waren_staff_address(text),public.waren_staff_preflight(uuid,text,text),public.waren_manage_member(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.waren_staff_address(text) to anon,authenticated;
grant execute on function public.waren_staff_preflight(uuid,text,text),public.waren_manage_member(uuid,uuid,text) to authenticated;

alter table waren_access.event_staff add column display_name text;
alter table public.ticket_staff add column display_name text;
alter table public.tickets add column checked_by_name text;
create function public.waren_coord_label(p_event uuid,p_name text) returns void language plpgsql security definer set search_path='' as $$
declare n text:=waren_access.clean_name(p_name);
begin
 if n is null or char_length(n) not between 2 and 60 or n ~ '[@[:cntrl:]]' then raise exception 'Nom invalide'; end if;
 update waren_access.event_staff set display_name=n where event_id=p_event and user_id=auth.uid() and role='coordination';
 if not found then raise exception 'Accès refusé' using errcode='42501'; end if;
end $$;
create function public.waren_assign_named(p_email text,p_role text,p_name text) returns void language plpgsql security definer set search_path='' as $$
declare n text:=waren_access.clean_name(p_name);
begin
 if n is null or char_length(n) not between 2 and 60 or n ~ '[@[:cntrl:]]' then raise exception 'Nom invalide'; end if;
 perform public.waren_assign(p_email,p_role);
 update public.ticket_staff set display_name=n where lower(email)=lower(btrim(p_email));
end $$;
revoke all on function public.waren_coord_label(uuid,text),public.waren_assign_named(text,text,text) from public,anon,authenticated;
grant execute on function public.waren_coord_label(uuid,text),public.waren_assign_named(text,text,text) to authenticated;
create function waren_access.operator_label(e uuid) returns text language sql stable security invoker set search_path='' as $$
 select coalesce(n.display_name,case when s.role='coordination' then coalesce(s.display_name,u.email)||' (coordination)' else s.display_name end,g.display_name,u.email)
 from auth.users u left join waren_access.staff_names n on n.user_id=u.id
 left join waren_access.event_staff s on s.user_id=u.id and s.event_id=e left join public.ticket_staff g on g.user_id=u.id where u.id=auth.uid()
$$;
revoke all on function waren_access.operator_label(uuid) from public,anon,authenticated;
create or replace function public.waren_coord_dashboard(p_event uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not waren_access.has_role(p_event,'coordination') then raise exception 'Accès refusé' using errcode='42501'; end if;
 select jsonb_build_object(
  'my_name',(select display_name from waren_access.event_staff where event_id=e.id and user_id=auth.uid()), 'title',e.title, 'starts_at',e.starts_at, 'location',e.location,
  'types',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'price',t.price,'quantity',t.quantity_total) order by t.price,t.id) from public.ticket_types t where t.event_id=e.id),'[]'::jsonb),
  'sales',coalesce((select jsonb_agg(to_jsonb(x) order by x.seller,x.name,x.type_id) from (
    select coalesce(nullif(btrim(k.sold_by),''),'Vendeur non renseigné') seller,t.id type_id,t.name,count(*) sold,
    count(*) filter(where k.status='utilise') used,sum(k.price_paid) revenue
    from public.tickets k join public.ticket_types t on t.id=k.ticket_type_id and t.event_id=k.event_id
    where k.event_id=e.id and k.status<>'annule' group by 1,2,3) x),'[]'::jsonb),
  'staff',coalesce((select jsonb_agg(to_jsonb(x) order by x.name) from (
     select p.user_id id,p.display_name name,true managed,coalesce(s.role,'inactif') role
       from waren_access.staff_names p left join waren_access.event_staff s using(event_id,user_id) where p.event_id=e.id
     union all select s.user_id,coalesce(s.display_name,u.email),false,s.role
       from waren_access.event_staff s join auth.users u on u.id=s.user_id where s.event_id=e.id and s.role<>'coordination'
       and not exists(select 1 from waren_access.staff_names p where p.user_id=s.user_id)
   ) x),'[]'::jsonb)
 ) into result from public.events e where e.id=p_event;
 return result;
end $$;

create or replace function public.waren_quote(p_event uuid,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare row jsonb;
begin
 if coalesce(public.waren_role(),'') not in ('vente','admin') and not waren_access.has_role(p_event,'vente') and not waren_access.has_role(p_event,'coordination') then raise exception 'Accès refusé'; end if;
 select jsonb_build_object('code',s.code,'name',t.name,'price',s.price) into row from public.paper_stock s join public.ticket_types t on t.id=s.type_id
 where t.event_id=p_event and s.state='pret' and (s.token=p_key or s.code=upper(p_key));
 if row is null then raise exception 'Billet inconnu, bloqué ou déjà vendu pour cet événement.'; end if;
 return row;
end $$;

create or replace function public.waren_sell(p_event uuid,p_codes text[],p_sale uuid) returns int language plpgsql security definer set search_path='' as $$
declare s record; n integer:=0; who text;
begin
 if coalesce(public.waren_role(),'') not in ('vente','admin') and not waren_access.has_role(p_event,'vente') and not waren_access.has_role(p_event,'coordination') then raise exception 'Accès refusé'; end if;
 if p_sale is null or coalesce(cardinality(p_codes),0) not between 1 and 50 or cardinality(p_codes)<>(select count(distinct c) from unnest(p_codes) c) then raise exception 'Panier invalide'; end if;
 who:=waren_access.operator_label(p_event);
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
 if coalesce(public.waren_role(),'') not in ('entree','admin') and not waren_access.has_role(p_event,'entree') and not waren_access.has_role(p_event,'coordination') then raise exception 'Accès refusé'; end if;
 select p.* into s from public.paper_stock p join public.ticket_types tt on tt.id=p.type_id where tt.event_id=p_event and (p.token=p_key or p.code=upper(p_key));
 if s.state in ('pret','bloque') then return jsonb_build_object('outcome',s.state); end if;
 select * into t from public.tickets where event_id=p_event and token=coalesce(s.token,p_key) for update;
 if t.id is null then return jsonb_build_object('outcome','missing'); end if;
 if t.status<>'valide' then return jsonb_build_object('outcome',t.status,'at',t.used_at,'checked_by',t.checked_by_name,'sold_by',nullif(btrim(t.sold_by),'')); end if;
 update public.tickets set status='utilise',used_at=clock_timestamp(),checked_by_name=waren_access.operator_label(p_event) where id=t.id returning * into t;
 return jsonb_build_object('outcome','accepted','checked_by',t.checked_by_name,'sold_by',nullif(btrim(t.sold_by),''));
end $$;
