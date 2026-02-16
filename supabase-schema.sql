-- ═══════════════════════════════════════════════════════════
-- STAMMBAUM – Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Members table
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_name TEXT DEFAULT '',
  birth_date DATE,
  death_date DATE,
  is_deceased BOOLEAN DEFAULT FALSE,
  is_placeholder BOOLEAN DEFAULT TRUE,
  claimed_by_uid UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  photo TEXT DEFAULT '',
  contact TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  location TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Relationships table
CREATE TABLE IF NOT EXISTS relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  to_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  rel_type TEXT NOT NULL CHECK (rel_type IN ('parent_child', 'spouse', 'sibling')),
  marriage_date DATE,
  divorce_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent duplicate relationships
  UNIQUE(from_id, to_id, rel_type)
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_members_claimed_by ON members(claimed_by_uid);
CREATE INDEX IF NOT EXISTS idx_members_name ON members(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_relationships_from ON relationships(from_id);
CREATE INDEX IF NOT EXISTS idx_relationships_to ON relationships(to_id);

-- 4. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 5. Row Level Security (RLS)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

-- Policies: any authenticated user can read everything
CREATE POLICY "Authenticated users can read members"
  ON members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update members"
  ON members FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete members"
  ON members FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR claimed_by_uid = auth.uid());

CREATE POLICY "Authenticated users can read relationships"
  ON relationships FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert relationships"
  ON relationships FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update relationships"
  ON relationships FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete relationships"
  ON relationships FOR DELETE
  TO authenticated
  USING (true);

-- 6. Seed demo data function (call manually or via app)
-- This creates a demo family "von Stammberg" for testing
CREATE OR REPLACE FUNCTION seed_demo_data()
RETURNS void AS $$
DECLARE
  m_ids UUID[];
  m UUID;
BEGIN
  -- Only seed if no members exist
  IF EXISTS (SELECT 1 FROM members LIMIT 1) THEN
    RAISE NOTICE 'Data already exists, skipping seed';
    RETURN;
  END IF;

  -- Generation 1 (Grandparents)
  INSERT INTO members (first_name, last_name, birth_date, death_date, is_deceased, is_placeholder, location, notes)
  VALUES ('Friedrich', 'von Stammberg', '1920-03-15', '1995-08-22', TRUE, TRUE, 'Schloss Stammberg', 'Familienoberhaupt, Gründer des Familientags')
  RETURNING id INTO m; m_ids := m_ids || m;  -- [0]

  INSERT INTO members (first_name, last_name, birth_name, birth_date, death_date, is_deceased, is_placeholder, location)
  VALUES ('Elisabeth', 'von Stammberg', 'geb. von Hohenfeld', '1924-07-03', '2001-12-10', TRUE, TRUE, 'Schloss Stammberg')
  RETURNING id INTO m; m_ids := m_ids || m;  -- [1]

  -- Generation 2 (Parents)
  INSERT INTO members (first_name, last_name, birth_date, is_placeholder, location, notes)
  VALUES ('Heinrich', 'von Stammberg', '1948-05-20', TRUE, 'München', 'Ältester Sohn, leitet den Familienbetrieb')
  RETURNING id INTO m; m_ids := m_ids || m;  -- [2]

  INSERT INTO members (first_name, last_name, birth_name, birth_date, is_placeholder, location)
  VALUES ('Maria', 'von Stammberg', 'geb. Freifrau von Linden', '1950-11-08', TRUE, 'München')
  RETURNING id INTO m; m_ids := m_ids || m;  -- [3]

  INSERT INTO members (first_name, last_name, birth_date, is_placeholder, location, notes)
  VALUES ('Wilhelm', 'von Stammberg', '1952-02-14', TRUE, 'Berlin', 'Diplomat, lebte lange im Ausland')
  RETURNING id INTO m; m_ids := m_ids || m;  -- [4]

  INSERT INTO members (first_name, last_name, birth_name, birth_date, is_placeholder, location, notes)
  VALUES ('Charlotte', 'Bergmann', 'geb. von Stammberg', '1955-09-30', TRUE, 'Hamburg', 'Ausgeheiratet in Familie Bergmann')
  RETURNING id INTO m; m_ids := m_ids || m;  -- [5]

  INSERT INTO members (first_name, last_name, birth_date, is_placeholder, location)
  VALUES ('Thomas', 'Bergmann', '1953-04-18', TRUE, 'Hamburg')
  RETURNING id INTO m; m_ids := m_ids || m;  -- [6]

  -- Generation 3 (Children/Cousins)
  INSERT INTO members (first_name, last_name, birth_date, is_placeholder, location, notes)
  VALUES ('Alexander', 'von Stammberg', '1975-08-12', TRUE, 'München', 'Rechtsanwalt, organisiert den Familientag')
  RETURNING id INTO m; m_ids := m_ids || m;  -- [7]

  INSERT INTO members (first_name, last_name, birth_name, birth_date, is_placeholder, location)
  VALUES ('Sophie', 'von Stammberg', 'geb. Fischer', '1978-03-25', TRUE, 'München')
  RETURNING id INTO m; m_ids := m_ids || m;  -- [8]

  INSERT INTO members (first_name, last_name, birth_date, is_placeholder, location, notes)
  VALUES ('Maximilian', 'von Stammberg', '1977-11-05', TRUE, 'Wien', 'Kunsthistoriker')
  RETURNING id INTO m; m_ids := m_ids || m;  -- [9]

  INSERT INTO members (first_name, last_name, birth_date, is_placeholder, location, notes)
  VALUES ('Katharina', 'von Stammberg', '1980-06-15', TRUE, 'Berlin', 'Ärztin')
  RETURNING id INTO m; m_ids := m_ids || m;  -- [10]

  INSERT INTO members (first_name, last_name, birth_name, birth_date, is_placeholder, location, notes)
  VALUES ('Julia', 'Meier', 'geb. Bergmann', '1982-01-20', TRUE, 'Hamburg', 'Ausgeheiratet')
  RETURNING id INTO m; m_ids := m_ids || m;  -- [11]

  INSERT INTO members (first_name, last_name, birth_date, is_placeholder, location)
  VALUES ('Felix', 'Bergmann', '1985-07-08', TRUE, 'Köln')
  RETURNING id INTO m; m_ids := m_ids || m;  -- [12]

  -- Generation 4 (Grandchildren)
  INSERT INTO members (first_name, last_name, birth_date, is_placeholder, location, notes)
  VALUES ('Luisa', 'von Stammberg', '2005-04-03', TRUE, 'München', 'Studentin')
  RETURNING id INTO m; m_ids := m_ids || m;  -- [13]

  INSERT INTO members (first_name, last_name, birth_date, is_placeholder, location)
  VALUES ('Moritz', 'von Stammberg', '2008-09-17', TRUE, 'München')
  RETURNING id INTO m; m_ids := m_ids || m;  -- [14]

  INSERT INTO members (first_name, last_name, birth_date, is_placeholder, location)
  VALUES ('Anna', 'von Stammberg', '2003-12-24', TRUE, 'Wien')
  RETURNING id INTO m; m_ids := m_ids || m;  -- [15]

  -- Spouse relationships
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[1], m_ids[2], 'spouse');
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[3], m_ids[4], 'spouse');
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[6], m_ids[7], 'spouse');
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[8], m_ids[9], 'spouse');

  -- Parent-child relationships
  -- Friedrich + Elisabeth → Heinrich, Wilhelm, Charlotte
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[1], m_ids[3], 'parent_child');
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[1], m_ids[5], 'parent_child');
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[1], m_ids[6], 'parent_child');
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[2], m_ids[3], 'parent_child');
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[2], m_ids[5], 'parent_child');
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[2], m_ids[6], 'parent_child');

  -- Heinrich + Maria → Alexander, Maximilian, Katharina
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[3], m_ids[8], 'parent_child');
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[3], m_ids[10], 'parent_child');
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[3], m_ids[11], 'parent_child');
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[4], m_ids[8], 'parent_child');
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[4], m_ids[10], 'parent_child');
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[4], m_ids[11], 'parent_child');

  -- Charlotte + Thomas → Julia, Felix
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[6], m_ids[12], 'parent_child');
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[6], m_ids[13], 'parent_child');
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[7], m_ids[12], 'parent_child');
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[7], m_ids[13], 'parent_child');

  -- Alexander + Sophie → Luisa, Moritz
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[8], m_ids[14], 'parent_child');
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[8], m_ids[15], 'parent_child');
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[9], m_ids[14], 'parent_child');
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[9], m_ids[15], 'parent_child');

  -- Maximilian → Anna
  INSERT INTO relationships (from_id, to_id, rel_type) VALUES (m_ids[10], m_ids[16], 'parent_child');

  RAISE NOTICE 'Demo data seeded successfully!';
END;
$$ LANGUAGE plpgsql;
