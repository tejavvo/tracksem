-- ============================================================
-- tracksem: Supabase migration
-- Run this in the Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. courses
CREATE TABLE IF NOT EXISTS courses (
  id         TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  full_name  TEXT NOT NULL,
  color      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own courses" ON courses;
CREATE POLICY "Users can manage their own courses"
  ON courses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. components (cascade-delete from courses)
CREATE TABLE IF NOT EXISTS components (
  id               TEXT PRIMARY KEY,
  course_id        TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  weight           REAL NOT NULL DEFAULT 0,
  max_score        REAL NOT NULL DEFAULT 100,
  score            REAL,
  best_of          INTEGER,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  stats_mode       TEXT DEFAULT 'global',
  scale_target_id  TEXT,
  class_avg        REAL,
  class_median     REAL,
  class_max        REAL,
  class_std_dev    REAL
);

ALTER TABLE components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage components of their courses" ON components;
CREATE POLICY "Users can manage components of their courses"
  ON components FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = components.course_id
        AND courses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = components.course_id
        AND courses.user_id = auth.uid()
    )
  );

-- 3. sub_items (cascade-delete from components)
CREATE TABLE IF NOT EXISTS sub_items (
  id               TEXT PRIMARY KEY,
  component_id     TEXT NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  score            REAL,
  max_score        REAL NOT NULL DEFAULT 100,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  class_avg        REAL,
  class_median     REAL,
  class_max        REAL,
  class_std_dev    REAL,
  scale_target_id  TEXT
);

ALTER TABLE sub_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage sub_items of their components" ON sub_items;
CREATE POLICY "Users can manage sub_items of their components"
  ON sub_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM components
      JOIN courses ON courses.id = components.course_id
      WHERE components.id = sub_items.component_id
        AND courses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM components
      JOIN courses ON courses.id = components.course_id
      WHERE components.id = sub_items.component_id
        AND courses.user_id = auth.uid()
    )
  );

-- 4. Class statistics / scaling columns (2026-10-31)
-- Tables created before these columns were added to the CREATE TABLE statements
-- never got them (CREATE TABLE IF NOT EXISTS doesn't alter existing tables), so
-- class stats were silently dropped. Idempotent: safe to run on any database.
ALTER TABLE components ADD COLUMN IF NOT EXISTS stats_mode      TEXT DEFAULT 'global';
ALTER TABLE components ADD COLUMN IF NOT EXISTS scale_target_id TEXT;
ALTER TABLE components ADD COLUMN IF NOT EXISTS class_avg       REAL;
ALTER TABLE components ADD COLUMN IF NOT EXISTS class_median    REAL;
ALTER TABLE components ADD COLUMN IF NOT EXISTS class_max       REAL;
ALTER TABLE components ADD COLUMN IF NOT EXISTS class_std_dev   REAL;

ALTER TABLE sub_items ADD COLUMN IF NOT EXISTS scale_target_id TEXT;
ALTER TABLE sub_items ADD COLUMN IF NOT EXISTS class_avg       REAL;
ALTER TABLE sub_items ADD COLUMN IF NOT EXISTS class_median    REAL;
ALTER TABLE sub_items ADD COLUMN IF NOT EXISTS class_max       REAL;
ALTER TABLE sub_items ADD COLUMN IF NOT EXISTS class_std_dev   REAL;

-- Make PostgREST pick up the new columns immediately.
NOTIFY pgrst, 'reload schema';

-- 5. Personal API tokens (2026-10-31)
-- Only a SHA-256 hash of each token is stored; the token itself is shown once.
CREATE TABLE IF NOT EXISTS api_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  token_hash    TEXT NOT NULL UNIQUE,
  prefix        TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ
);

ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own API tokens" ON api_tokens;
CREATE POLICY "Users can manage their own API tokens"
  ON api_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
