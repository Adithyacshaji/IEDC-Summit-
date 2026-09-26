-- ============================================================
-- DIAGNOSTIC: Run these one by one in Supabase SQL Editor
-- ============================================================

-- CHECK 1: Is there any data in the table?
SELECT COUNT(*) FROM events;

-- CHECK 2: Does the RLS read policy exist?
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'events';

-- CHECK 3: Is RLS enabled on the table?
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'events';
