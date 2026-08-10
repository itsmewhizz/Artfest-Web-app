-- Migration: Add Chest No to students and update General category to General Cat-A

-- 1. Add chestNo column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS "chestNo" text;

-- 2. Rename existing "General" category in programmes table to "General Cat-A"
UPDATE programmes SET category = 'General Cat-A' WHERE category = 'General';
