-- ═══════════════════════════════════════════════════════════
-- STAMMBAUM – Migration: Add 'sibling' relationship type
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Drop the old CHECK constraint and add a new one with 'sibling' included
ALTER TABLE relationships DROP CONSTRAINT IF EXISTS relationships_rel_type_check;
ALTER TABLE relationships ADD CONSTRAINT relationships_rel_type_check
  CHECK (rel_type IN ('parent_child', 'spouse', 'sibling'));
