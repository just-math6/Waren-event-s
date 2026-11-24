-- Paper, direct sales, cancelled tickets and blocked stock; no fixture is kept.
begin;
do $test$
declare owner_id uuid:='d04b977b-cf36-43ec-b202-25b785312ac5'; c uuid:=gen_random_uuid();
 e uuid; typ uuid; lot uuid; codes text[]; row_data jsonb; sold integer;
begin
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 insert into auth.users(id,email,email_confirmed_at) values(c,c||'@example.invalid',now());
 e:=public.create_event_with_ticket_types('Test stock','Test',now(),'[{"name":"VIP","price":"1500","quantity_total":"10"},{"name":"VVIP","price":"2000","quantity_total":"5"}]');
 perform public.waren_name_coordinator(e,c||'@example.invalid');
 select id into typ from public.ticket_types where event_id=e and name='VIP';
 lot:=public.waren_print(typ,8);
 select array_agg(code order by code) into codes from public.paper_stock where batch=lot;
 perform public.waren_sell(e,codes[1:3],gen_random_uuid());
 perform set_config('request.jwt.claim.sub',c::text,true);
 select x into row_data from jsonb_array_elements(public.waren_coord_dashboard(e)->'types') x where x->>'name'='VIP';
 assert row_data @> '{"quantity":10,"paper_prepared":8,"paper_ready":5}';
 select x into row_data from jsonb_array_elements(public.waren_coord_dashboard(e)->'types') x where x->>'name'='VVIP';
 assert row_data @> '{"paper_prepared":0,"paper_ready":0}';
 perform public.waren_gate(e,codes[1]);
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 update public.tickets set status='annule',cancel_reason='Fixture' where event_id=e and token=(select token from public.paper_stock where code=codes[2]);
 insert into public.tickets(event_id,ticket_type_id,token,buyer_name,price_paid,sold_by) values(e,typ,replace(gen_random_uuid()::text,'-',''),'Test',1500,'Test');
 lot:=public.waren_print(typ,1);
 perform public.waren_block(lot);
 perform set_config('request.jwt.claim.sub',c::text,true);
 select x into row_data from jsonb_array_elements(public.waren_coord_dashboard(e)->'types') x where x->>'name'='VIP';
 select sum((x->>'sold')::int) into sold from jsonb_array_elements(public.waren_coord_dashboard(e)->'sales') x;
 assert row_data @> '{"quantity":10,"paper_prepared":7,"paper_ready":5}' and sold=3;
end $test$;
rollback;
