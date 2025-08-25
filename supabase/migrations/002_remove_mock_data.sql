-- Remove all mock data from the database
-- This will clean up all sample data while keeping the table structure

-- Remove sample show availability records
DELETE FROM show_availability;

-- Remove sample show assignments
DELETE FROM show_assignments;

-- Remove sample show dates
DELETE FROM show_dates;

-- Remove sample shows
DELETE FROM shows;

-- Remove sample attendance records
DELETE FROM attendance_records;

-- Remove sample coaching sessions
DELETE FROM coaching_sessions;

-- Remove sample users
DELETE FROM users;

-- Reset sequences if any (PostgreSQL will handle UUIDs automatically)
-- The tables are now clean and ready for real data
