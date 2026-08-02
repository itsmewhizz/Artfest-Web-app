-- Add missing student credentials for login
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- 
-- Current state: only 4 of 15 students have credentials.
-- This inserts 'password123' for every student missing one.

INSERT INTO student_credentials (student_id, password)
SELECT s.id, 'password123'
FROM students s
WHERE s.id NOT IN (SELECT student_id FROM student_credentials);
