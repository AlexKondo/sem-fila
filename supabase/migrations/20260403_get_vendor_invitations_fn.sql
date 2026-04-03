CREATE OR REPLACE FUNCTION public.get_vendor_invitations(p_vendor_id uuid)
RETURNS TABLE (
  id uuid, event_id uuid, vendor_id uuid, status text,
  fee_amount numeric, invited_at timestamptz, responded_at timestamptz,
  event_name text, event_location text, event_start_date timestamptz,
  event_end_date timestamptz, event_start_time text, event_end_time text,
  event_address text, event_rules text, org_name text
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT evi.id, evi.event_id, evi.vendor_id, evi.status, evi.fee_amount,
    evi.invited_at, evi.responded_at, e.name, e.location, e.start_date,
    e.end_date, e.start_time, e.end_time, e.address, e.rules, o.name
  FROM event_vendor_invitations evi
  LEFT JOIN events e ON e.id = evi.event_id
  LEFT JOIN organizations o ON o.id = e.organization_id
  WHERE evi.vendor_id = p_vendor_id
    AND EXISTS (SELECT 1 FROM vendors v WHERE v.id = p_vendor_id AND v.owner_id = auth.uid())
  ORDER BY evi.invited_at DESC;
$$;
