
/*
# Rodland Apartments Operations — Initial Schema

## Summary
Creates the full schema for the Rodland Apartments Operations dashboard.

## New Tables

### rooms
Stores the 8 managed rooms (Room 3, 4, 31–36).
- id: serial primary key
- name: room name (e.g. "Room 3")
- room_type: '2BR Suite' or 'Single'
- status: one of occupied/ready/needs_cleaning/maintenance/vacant
- base_rate: nightly rate in UGX
- sort_order: display order
- created_at: timestamp

### bookings
All reservations — never hard-deleted, soft-cancelled.
- id: serial primary key
- room_id: FK to rooms
- guest_name, check_in, check_out, source, nightly_rate, notes
- status: 'confirmed' or 'cancelled'
- cancelled_at, cancellation_reason: populated on cancel
- payment_status: airbnb/paid/partial/unpaid
- created_at

### room_status_log
Audit trail of every room status change.
- id: serial primary key
- room_id: FK to rooms
- old_status, new_status
- changed_at: timestamp
- note: optional free text

## Security
- RLS enabled on all three tables
- anon + authenticated policies (no auth in app)

## Seed Data
- 8 rooms seeded on first run
- 4 sample bookings for current month
*/

-- rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id serial PRIMARY KEY,
  name text NOT NULL,
  room_type text NOT NULL,
  status text NOT NULL DEFAULT 'vacant',
  base_rate integer NOT NULL,
  sort_order integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_rooms" ON rooms;
CREATE POLICY "anon_select_rooms" ON rooms FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_rooms" ON rooms;
CREATE POLICY "anon_insert_rooms" ON rooms FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_rooms" ON rooms;
CREATE POLICY "anon_update_rooms" ON rooms FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_rooms" ON rooms;
CREATE POLICY "anon_delete_rooms" ON rooms FOR DELETE TO anon, authenticated USING (true);

-- bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id serial PRIMARY KEY,
  room_id integer NOT NULL REFERENCES rooms(id),
  guest_name text NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  source text NOT NULL DEFAULT 'Direct',
  nightly_rate integer NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'confirmed',
  cancelled_at timestamptz,
  cancellation_reason text,
  payment_status text NOT NULL DEFAULT 'unpaid',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_bookings" ON bookings;
CREATE POLICY "anon_select_bookings" ON bookings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bookings" ON bookings;
CREATE POLICY "anon_insert_bookings" ON bookings FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_bookings" ON bookings;
CREATE POLICY "anon_update_bookings" ON bookings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_bookings" ON bookings;
CREATE POLICY "anon_delete_bookings" ON bookings FOR DELETE TO anon, authenticated USING (true);

-- room_status_log table
CREATE TABLE IF NOT EXISTS room_status_log (
  id serial PRIMARY KEY,
  room_id integer NOT NULL REFERENCES rooms(id),
  old_status text NOT NULL,
  new_status text NOT NULL,
  changed_at timestamptz DEFAULT now(),
  note text
);

ALTER TABLE room_status_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_room_status_log" ON room_status_log;
CREATE POLICY "anon_select_room_status_log" ON room_status_log FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_room_status_log" ON room_status_log;
CREATE POLICY "anon_insert_room_status_log" ON room_status_log FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_room_status_log" ON room_status_log;
CREATE POLICY "anon_update_room_status_log" ON room_status_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_room_status_log" ON room_status_log;
CREATE POLICY "anon_delete_room_status_log" ON room_status_log FOR DELETE TO anon, authenticated USING (true);

-- Seed rooms (only if empty)
INSERT INTO rooms (name, room_type, base_rate, sort_order)
SELECT * FROM (VALUES
  ('Room 3',  '2BR Suite', 180000, 1),
  ('Room 4',  '2BR Suite', 180000, 2),
  ('Room 31', 'Single',    90000, 3),
  ('Room 32', 'Single',    90000, 4),
  ('Room 33', 'Single',    90000, 5),
  ('Room 34', 'Single',    90000, 6),
  ('Room 35', 'Single',    90000, 7),
  ('Room 36', 'Single',    90000, 8)
) AS v(name, room_type, base_rate, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM rooms LIMIT 1);

-- Seed sample bookings (only if bookings table is empty)
INSERT INTO bookings (room_id, guest_name, check_in, check_out, source, nightly_rate, status, payment_status)
SELECT
  r.id,
  b.guest_name,
  (date_trunc('month', CURRENT_DATE) + (b.check_in_day - 1) * interval '1 day')::date,
  (date_trunc('month', CURRENT_DATE) + (b.check_out_day - 1) * interval '1 day')::date,
  b.source,
  b.nightly_rate,
  'confirmed',
  b.payment_status
FROM (VALUES
  ('Room 31', 'James Otieno',  2,  7,  'Airbnb',      90000, 'airbnb'),
  ('Room 3',  'Sarah Nakato',  8,  13, 'Direct',       180000, 'unpaid'),
  ('Room 32', 'Priya Sharma',  14, 18, 'Booking.com',  90000, 'partial'),
  ('Room 4',  'David Kimani',  20, 25, 'Walk-in',      180000, 'unpaid')
) AS b(room_name, guest_name, check_in_day, check_out_day, source, nightly_rate, payment_status)
JOIN rooms r ON r.name = b.room_name
WHERE NOT EXISTS (SELECT 1 FROM bookings LIMIT 1);
