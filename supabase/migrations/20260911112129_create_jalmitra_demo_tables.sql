/*
# Create JalMitra synthetic demo tables

1. New Tables
- `jalmitra_farmers`: farmer dashboard profile and water entitlement snapshot.
- `jalmitra_requests`: natural-language water requests and their review status.
- `jalmitra_audit_events`: human-readable actions shown in the demo audit feed.

2. Security
- Enable row-level security on all three tables.
- Allow anonymous and authenticated access because this is a clearly labeled, single-tenant synthetic demonstration with no sign-in screen.
- Provide separate SELECT, INSERT, UPDATE, and DELETE policies for each table.

3. Important Notes
- Seed data is synthetic and intentionally labeled in the product UI.
- Requests are persisted so the demo flow survives a page refresh.
*/

CREATE TABLE IF NOT EXISTS jalmitra_farmers (
  id text PRIMARY KEY,
  name text NOT NULL,
  village text NOT NULL,
  crop text NOT NULL,
  crop_stage text NOT NULL,
  area_acres numeric NOT NULL DEFAULT 0,
  entitlement_liters integer NOT NULL DEFAULT 0,
  received_liters integer NOT NULL DEFAULT 0,
  channel text NOT NULL DEFAULT 'Canal 2',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jalmitra_requests (
  id text PRIMARY KEY,
  farmer_id text NOT NULL REFERENCES jalmitra_farmers(id) ON DELETE CASCADE,
  request_text text NOT NULL,
  crop text NOT NULL,
  crop_stage text NOT NULL,
  liters_requested integer NOT NULL,
  urgency text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'under_review',
  missing_info text[] NOT NULL DEFAULT '{}',
  conflict_flag boolean NOT NULL DEFAULT false,
  recommendation text NOT NULL DEFAULT 'Option B · Balanced allocation',
  fairness_score integer NOT NULL DEFAULT 92,
  risk_score integer NOT NULL DEFAULT 18,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jalmitra_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text REFERENCES jalmitra_requests(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  detail text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE jalmitra_farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jalmitra_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE jalmitra_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_farmers" ON jalmitra_farmers;
CREATE POLICY "public_read_farmers" ON jalmitra_farmers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_farmers" ON jalmitra_farmers;
CREATE POLICY "public_insert_farmers" ON jalmitra_farmers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_farmers" ON jalmitra_farmers;
CREATE POLICY "public_update_farmers" ON jalmitra_farmers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_farmers" ON jalmitra_farmers;
CREATE POLICY "public_delete_farmers" ON jalmitra_farmers FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_requests" ON jalmitra_requests;
CREATE POLICY "public_read_requests" ON jalmitra_requests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_requests" ON jalmitra_requests;
CREATE POLICY "public_insert_requests" ON jalmitra_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_requests" ON jalmitra_requests;
CREATE POLICY "public_update_requests" ON jalmitra_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_requests" ON jalmitra_requests;
CREATE POLICY "public_delete_requests" ON jalmitra_requests FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_audit_events" ON jalmitra_audit_events;
CREATE POLICY "public_read_audit_events" ON jalmitra_audit_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_audit_events" ON jalmitra_audit_events;
CREATE POLICY "public_insert_audit_events" ON jalmitra_audit_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_audit_events" ON jalmitra_audit_events;
CREATE POLICY "public_update_audit_events" ON jalmitra_audit_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_audit_events" ON jalmitra_audit_events;
CREATE POLICY "public_delete_audit_events" ON jalmitra_audit_events FOR DELETE TO anon, authenticated USING (true);

INSERT INTO jalmitra_farmers (id, name, village, crop, crop_stage, area_acres, entitlement_liters, received_liters, channel)
VALUES ('FMH-1042', 'Ramesh Patil', 'Khed, Maharashtra', 'Soybean', 'Flowering stage', 2.4, 60000, 42000, 'Canal 2')
ON CONFLICT (id) DO NOTHING;

INSERT INTO jalmitra_requests (id, farmer_id, request_text, crop, crop_stage, liters_requested, urgency, status, missing_info, conflict_flag, recommendation, fairness_score, risk_score)
VALUES ('REQ-2408', 'FMH-1042', 'My soybean is flowering, I need 30,000 L urgently.', 'Soybean', 'Flowering stage', 30000, 'high', 'under_review', '{}', false, 'Option B · Balanced allocation', 92, 18)
ON CONFLICT (id) DO NOTHING;

INSERT INTO jalmitra_audit_events (request_id, event_type, title, detail)
SELECT 'REQ-2408', 'request', 'Request received', 'Natural-language request translated into a reviewable water claim.'
WHERE NOT EXISTS (SELECT 1 FROM jalmitra_audit_events WHERE request_id = 'REQ-2408' AND event_type = 'request');

INSERT INTO jalmitra_audit_events (request_id, event_type, title, detail)
SELECT 'REQ-2408', 'ai', 'AI extraction complete', 'Crop, stage, urgency and 30,000 L need identified.'
WHERE NOT EXISTS (SELECT 1 FROM jalmitra_audit_events WHERE request_id = 'REQ-2408' AND event_type = 'ai');

CREATE INDEX IF NOT EXISTS jalmitra_requests_status_idx ON jalmitra_requests(status);
CREATE INDEX IF NOT EXISTS jalmitra_requests_farmer_idx ON jalmitra_requests(farmer_id);
CREATE INDEX IF NOT EXISTS jalmitra_audit_events_request_idx ON jalmitra_audit_events(request_id);
