begin;
do $check$
declare c uuid:=gen_random_uuid(); w uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); event uuid; ty uuid; token text; request uuid:=gen_random_uuid(); r jsonb;
begin
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) select x,x::text||'@example.invalid',now(),false from unnest(array[c,w,outsider]) x;
 perform set_config('request.jwt.claim.sub','d04b977b-cf36-43ec-b202-25b785312ac5',true);
 event:=public.create_event_with_ticket_types('QA équipe','Test',now(),'[{"name":"VIP","price":"1500","quantity_total":"2"}]');
 select id into ty from public.ticket_types where event_id=event;
 perform public.waren_print(ty,1);
 insert into waren_access.event_staff(event_id,user_id,role,display_name) values(event,c,'coordination','Coord'),(event,w,'terrain','Agent');
 perform set_config('request.jwt.claim.sub',w::text,true);
 assert (public.waren_sales_catalog(event)->0->>'available')::int=1;
 token:=public.waren_sell_virtual(event,ty,'Sam','22670000000',request);
 assert token=public.waren_sell_virtual(event,ty,'Sam','22670000000',request);
 assert (public.waren_my_sales(event)->0->>'token')=token;
 begin perform public.waren_sell_virtual(event,ty,'Deux','22670000001',gen_random_uuid());raise exception 'quota bypassed';exception when others then if sqlerrm not like 'Plus de billets disponibles%' then raise;end if;end;
 r:=public.waren_gate_detail(event,token);assert r->>'outcome'='accepted' and r->>'sold_by'='Agent' and r->>'channel'='Virtuel' and r->>'type'='VIP';
 assert public.waren_gate_detail(event,token)->>'outcome'='utilise';assert (public.waren_gate_count(event)->>'used')::int=1;
 assert public.waren_gate_detail(event,'absent')->>'outcome'='missing';
 begin perform public.waren_cash_counts(event);raise exception 'cash visible to staff';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',c::text,true);
 assert jsonb_array_length(public.waren_my_sales(event))=0;
 perform public.waren_count_cash(event,'Agent',1000,'500 à vérifier'); assert (public.waren_cash_counts(event)->0->>'counted')::int=1000;
 perform set_config('request.jwt.claim.sub',outsider::text,true);
 begin perform public.waren_my_sales(event);raise exception 'sales visible cross event';exception when insufficient_privilege then null;end;
end $check$;
rollback;
