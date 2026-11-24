-- Return the seller recorded at sale only when a sold ticket matches this event.
create or replace function public.waren_gate(p_event uuid,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.paper_stock; t public.tickets;
begin
 if coalesce(public.waren_role(),'') not in ('entree','admin') then raise exception 'Accès refusé'; end if;
 select p.* into s from public.paper_stock p join public.ticket_types tt on tt.id=p.type_id where tt.event_id=p_event and (p.token=p_key or p.code=upper(p_key));
 if s.state in ('pret','bloque') then return jsonb_build_object('outcome',s.state); end if;
 select * into t from public.tickets where event_id=p_event and token=coalesce(s.token,p_key) for update;
 if t.id is null then return jsonb_build_object('outcome','missing'); end if;
 if t.status<>'valide' then return jsonb_build_object('outcome',t.status,'at',t.used_at,'sold_by',nullif(btrim(t.sold_by),'')); end if;
 update public.tickets set status='utilise',used_at=clock_timestamp() where id=t.id;
 return jsonb_build_object('outcome','accepted','sold_by',nullif(btrim(t.sold_by),''));
end $$;

CREATE OR REPLACE FUNCTION public.check_in_ticket(p_event_id uuid, p_token text, p_request_id uuid, p_scanned_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE t public.tickets%ROWTYPE;
BEGIN
  IF auth.uid() IS DISTINCT FROM 'd04b977b-cf36-43ec-b202-25b785312ac5'::uuid THEN
    RAISE EXCEPTION 'Accès administrateur requis' USING ERRCODE = '42501';
  END IF;
  IF p_request_id IS NULL OR p_scanned_at IS NULL OR NOT isfinite(p_scanned_at) THEN
    RAISE EXCEPTION 'Scan invalide' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO t FROM public.tickets WHERE event_id = p_event_id AND token = p_token FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('outcome', 'missing'); END IF;
  IF t.status = 'annule' THEN RETURN jsonb_build_object('outcome', 'cancelled', 'name', t.buyer_name, 'sold_by', nullif(btrim(t.sold_by), '')); END IF;
  IF t.status = 'utilise' THEN
    RETURN jsonb_build_object('outcome', CASE WHEN t.checkin_request_id = p_request_id THEN 'accepted' ELSE 'duplicate' END, 'name', t.buyer_name, 'sold_by', nullif(btrim(t.sold_by), ''), 'used_at', t.used_at);
  END IF;
  UPDATE public.tickets SET status = 'utilise', used_at = LEAST(p_scanned_at, clock_timestamp()), checkin_request_id = p_request_id
    WHERE id = t.id RETURNING * INTO t;
  RETURN jsonb_build_object('outcome', 'accepted', 'name', t.buyer_name, 'sold_by', nullif(btrim(t.sold_by), ''), 'used_at', t.used_at);
END $$;
