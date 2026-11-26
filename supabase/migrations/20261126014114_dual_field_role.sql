begin;
alter table waren_access.event_staff drop constraint event_staff_role_check;
alter table waren_access.event_staff add constraint event_staff_role_check check(role in ('coordination','vente','entree','terrain'));
create or replace function waren_access.has_role(e uuid,r text) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from waren_access.event_staff where event_id=e and user_id=(select auth.uid()) and (role=r or (role='terrain' and r in ('vente','entree'))))
$$;
create or replace function waren_access.check_new_member(e uuid,c uuid,n text,r text) returns void language plpgsql set search_path='' as $$
begin
 perform 1 from waren_access.event_staff where event_id=e and user_id=c and role='coordination' for share;
 if not found then raise exception 'Accès refusé' using errcode='42501'; end if;
 if r is null or r not in ('vente','entree','terrain') or n is null or char_length(n) not between 2 and 60 or n ~ '[@[:cntrl:]]' then raise exception 'Nom ou rôle invalide' using errcode='22023'; end if;
 if exists(select 1 from waren_access.staff_names where name_key=lower(n)) then raise exception 'Nom déjà utilisé' using errcode='23505'; end if;
end $$;
create or replace function waren_access.restrict_named_membership() returns trigger language plpgsql security definer set search_path='' as $$
declare origin text;
begin
 select u.raw_app_meta_data->'waren_staff_seed'->>'event' into origin from auth.users u where u.id=new.user_id;
 if origin is null then return new; end if;
 if tg_table_name='ticket_staff' then raise exception 'Compte réservé à son événement'; end if;
 if new.event_id is distinct from origin::uuid or new.role not in ('vente','entree','terrain') then raise exception 'Compte réservé à son événement'; end if;
 return new;
end $$;
create or replace function public.waren_staff_address(p_name text) returns text language sql stable security definer set search_path='' as $$
 with k as (select lower(waren_access.clean_name(left(p_name,256))) as n)
 select coalesce((select s.login_address from waren_access.staff_names s join waren_access.event_staff m using(event_id,user_id), k
  where s.name_key=k.n and m.role in ('vente','entree','terrain')),md5(coalesce((select n from k),''))::uuid::text||'@staff.waren.invalid')
$$;
create or replace function public.waren_manage_member(p_event uuid,p_user uuid,p_action text) returns uuid language plpgsql security definer set search_path='' as $$
begin
 perform 1 from waren_access.event_staff where event_id=p_event and user_id=auth.uid() and role='coordination' for share;
 if not found then raise exception 'Accès refusé' using errcode='42501'; end if;
 perform 1 from waren_access.event_staff where event_id=p_event and user_id=p_user and role in ('vente','entree','terrain') for update;
 if not found then
   if p_action in ('vente','entree','terrain') and exists(select 1 from waren_access.staff_names where event_id=p_event and user_id=p_user) then
     insert into waren_access.event_staff(event_id,user_id,role) values(p_event,p_user,p_action); return p_user;
   end if;
   raise exception 'Membre introuvable';
 end if;
 if p_action='retirer' then delete from waren_access.event_staff where event_id=p_event and user_id=p_user;
 elsif p_action in ('vente','entree','terrain') then update waren_access.event_staff set role=p_action where event_id=p_event and user_id=p_user;
 elsif p_action='password' and exists(select 1 from waren_access.staff_names where event_id=p_event and user_id=p_user) then null;
 else raise exception 'Action refusée'; end if;
 return p_user;
end $$;
commit;
