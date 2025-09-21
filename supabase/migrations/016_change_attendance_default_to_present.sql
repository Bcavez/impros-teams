-- Change the default value for attendance_records.status from 'absent' to 'present'
-- This affects new attendance records created when users are assigned to teams

-- First, let's see what the current default is
SELECT column_default 
FROM information_schema.columns 
WHERE table_name = 'attendance_records' 
AND column_name = 'status';

-- Change the default value
ALTER TABLE attendance_records 
ALTER COLUMN status SET DEFAULT 'present';

-- Verify the change
SELECT column_default 
FROM information_schema.columns 
WHERE table_name = 'attendance_records' 
AND column_name = 'status';

-- Add a comment to document the change
COMMENT ON COLUMN attendance_records.status IS 'Attendance status: present, absent, or undecided. Default is now present.';
