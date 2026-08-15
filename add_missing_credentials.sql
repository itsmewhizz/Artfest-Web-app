-- Set the common participant password for all student accounts.
-- This updates any existing credential rows and creates missing ones.

UPDATE student_credentials
SET password = 'israfest2026';

INSERT INTO student_credentials (student_id, password)
SELECT s.id, 'israfest2026'
FROM students s
WHERE s.id NOT IN (SELECT student_id FROM student_credentials);
