-- All demonstration identities, tickets and memberships here are rolled back.
begin;
do $test$
declare admin_id uuid:='d04b977b-cf36-43ec-b202-25b785312ac5'; coord uuid:=gen_random_uuid(); seller uuid:=gen_random_uuid(); ev uuid; other_e uuid; typ uuid; lot uuid; code1 text; code2 text; receipt jsonb; nm text:='Awa '||left(seller::text,8); addr text:=seller||'@staff.waren.invalid';
begin
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 insert into auth.users(id,email,email_confirmed_at) values(coord,coord||'@example.invalid',now());
 ev:=public.create_event_with_ticket_types('Team tests','Test',now(),'[{"name":"VIP","price":"1500","quantity_total":"5"}]');
 other_e:=public.create_event_with_ticket_types('Other tests','Test',now(),'[{"name":"VIP","price":"1500","quantity_total":"5"}]');
 perform public.waren_name_coordinator(ev,coord||'@example.invalid');
 select id into typ from public.ticket_types where event_id=ev;
 lot:=public.waren_print(typ,2);select min(code),max(code) into code1,code2 from public.paper_stock where batch=lot;
 perform set_config('request.jwt.claim.sub',coord::text,true);
 perform public.waren_coord_label(ev,'Jo Test');
 begin perform public.waren_staff_preflight(other_e,nm,'vente');raise exception 'cross event'; exception when insufficient_privilege then null;end;
 insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values(seller,addr,now(),jsonb_build_object('waren_staff_seed',jsonb_build_object('creator',coord,'event',ev,'name',nm,'role','vente')));
 perform public.waren_activate_named(ev,seller);
 assert public.waren_staff_address('  '||upper(nm)||' ')=addr;
 assert public.waren_coord_dashboard(ev)->'staff'->0->>'name'=nm;
 begin perform public.waren_staff_preflight(ev,nm,'entree');raise exception 'duplicate name'; exception when unique_violation then null;end;
 perform set_config('request.jwt.claim.sub',seller::text,true);
 assert public.waren_sell(ev,array[code1],gen_random_uuid())=1;
 perform set_config('request.jwt.claim.sub',coord::text,true);
 receipt:=public.waren_gate(ev,code1);
 assert receipt->>'outcome'='accepted' and receipt->>'sold_by'=nm and receipt->>'checked_by'='Jo Test (coordination)';
 assert public.waren_quote(ev,code2)->>'name'='VIP';
 assert public.waren_sell(ev,array[code2],gen_random_uuid())=1;
 assert public.waren_gate(ev,code2)->>'sold_by'='Jo Test (coordination)';
 begin perform public.waren_gate(other_e,code1);raise exception 'cross event';exception when others then if sqlerrm<>'Accès refusé' then raise;end if;end;
 perform public.waren_manage_member(ev,seller,'retirer');
 assert public.waren_staff_address(nm)<>addr;
 perform public.waren_manage_member(ev,seller,'entree');
 perform set_config('request.jwt.claim.sub',seller::text,true);
 assert public.waren_gate(ev,code1)->>'outcome'='utilise';
end $test$;
rollback;
