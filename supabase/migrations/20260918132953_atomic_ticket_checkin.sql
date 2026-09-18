ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS checkin_request_id uuid;

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
  IF t.status = 'annule' THEN RETURN jsonb_build_object('outcome', 'cancelled', 'name', t.buyer_name); END IF;
  IF t.status = 'utilise' THEN
    RETURN jsonb_build_object('outcome', CASE WHEN t.checkin_request_id = p_request_id THEN 'accepted' ELSE 'duplicate' END, 'name', t.buyer_name, 'used_at', t.used_at);
  END IF;
  UPDATE public.tickets SET status = 'utilise', used_at = LEAST(p_scanned_at, clock_timestamp()), checkin_request_id = p_request_id
    WHERE id = t.id RETURNING * INTO t;
  RETURN jsonb_build_object('outcome', 'accepted', 'name', t.buyer_name, 'used_at', t.used_at);
END $$;
REVOKE ALL ON FUNCTION public.check_in_ticket(uuid,text,uuid,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_in_ticket(uuid,text,uuid,timestamptz) TO authenticated;
