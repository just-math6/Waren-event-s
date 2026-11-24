-- Stock counts share the same snapshot and coordinator guard as sales.
create or replace function public.waren_coord_dashboard(p_event uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not waren_access.has_role(p_event,'coordination') then raise exception 'Accès refusé' using errcode='42501'; end if;
 select jsonb_build_object(
  'my_name',(select display_name from waren_access.event_staff where event_id=e.id and user_id=auth.uid()), 'title',e.title, 'starts_at',e.starts_at, 'location',e.location,
  'types',coalesce((
    select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'price',t.price,'quantity',t.quantity_total,
      'paper_ready',p.ready,'paper_prepared',p.ready+p.paper_sold) order by t.price,t.id)
    from public.ticket_types t
    cross join lateral (
      select count(*) filter(where s.state='pret') ready,
        count(*) filter(where s.state='vendu' and k.status<>'annule') paper_sold
      from public.paper_stock s
      left join public.tickets k on k.token=s.token and k.event_id=t.event_id and k.ticket_type_id=t.id
      where s.type_id=t.id
    ) p where t.event_id=e.id
  ),'[]'::jsonb),
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
