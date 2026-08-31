-- Create weekly coaching sessions for each Sunday until end of May 2026
-- This script generates coaching sessions for all three teams (Samurai, Gladiator, Viking)

DO $$
DECLARE
    start_date DATE := '2024-12-22'; -- Start from next Sunday (adjust as needed)
    end_date DATE := '2026-05-31';
    current_day DATE := start_date;
    session_date DATE;
    teams TEXT[] := ARRAY['Samurai', 'Gladiator', 'Viking'];
    team_name TEXT;
    system_user_id UUID;
    session_count INTEGER := 0;
BEGIN
    -- Get the first admin user ID, or create a system user if none exists
    SELECT id INTO system_user_id FROM users WHERE role = 'admin' LIMIT 1;
    
    -- If no admin user exists, create a system user
    IF system_user_id IS NULL THEN
        INSERT INTO users (name, email, password_hash, role, team)
        VALUES ('System', 'system@team-management.com', '$2b$10$dummy.hash.for.system.user', 'admin', 'Samurai')
        RETURNING id INTO system_user_id;
    END IF;
    -- Loop through each Sunday from start_date to end_date
    WHILE current_day <= end_date LOOP
        -- Check if current_day is a Sunday (0 = Sunday in PostgreSQL)
        IF EXTRACT(DOW FROM current_day) = 0 THEN
            session_date := current_day;
            
            -- Create coaching sessions for each team
            FOREACH team_name IN ARRAY teams LOOP
                -- Check if session already exists for this date and team
                IF NOT EXISTS (
                    SELECT 1 FROM coaching_sessions 
                    WHERE date = session_date AND team = team_name
                ) THEN
                    -- Insert the coaching session
                    INSERT INTO coaching_sessions (date, team, coach, created_by)
                    VALUES (
                        session_date,
                        team_name,
                        'Coach à définir', -- Default coach name, can be updated later
                        system_user_id -- Use the system user ID
                    );
                    
                    session_count := session_count + 1;
                    
                    RAISE NOTICE 'Created coaching session for % team on %', team_name, session_date;
                ELSE
                    RAISE NOTICE 'Coaching session already exists for % team on %', team_name, session_date;
                END IF;
            END LOOP;
        END IF;
        
        -- Move to next day
        current_day := current_day + INTERVAL '1 day';
    END LOOP;
    
    RAISE NOTICE 'Completed! Created % coaching sessions', session_count;
END $$;

-- Optional: Create attendance records for all existing team members for the new sessions
-- This will create default attendance records with 'present' status for all team members

DO $$
DECLARE
    session_record RECORD;
    team_member RECORD;
    attendance_count INTEGER := 0;
    system_user_id UUID;
BEGIN
    -- Get the system user ID (same logic as above)
    SELECT id INTO system_user_id FROM users WHERE name = 'System' AND email = 'system@team-management.com' LIMIT 1;
    
    -- If no system user found, get any admin user
    IF system_user_id IS NULL THEN
        SELECT id INTO system_user_id FROM users WHERE role = 'admin' LIMIT 1;
    END IF;
    
    -- Only proceed if we have a system user
    IF system_user_id IS NOT NULL THEN
        -- Get all coaching sessions created by the system user
        FOR session_record IN 
            SELECT id, date, team FROM coaching_sessions 
            WHERE created_by = system_user_id AND date >= CURRENT_DATE
    LOOP
        -- Get all team members for this team
        FOR team_member IN 
            SELECT id FROM users WHERE team = session_record.team
        LOOP
            -- Check if attendance record already exists
            IF NOT EXISTS (
                SELECT 1 FROM attendance_records 
                WHERE user_id = team_member.id AND session_id = session_record.id
            ) THEN
                -- Create default attendance record
                INSERT INTO attendance_records (user_id, session_id, status)
                VALUES (team_member.id, session_record.id, 'present');
                
                attendance_count := attendance_count + 1;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Created % default attendance records', attendance_count;
    ELSE
        RAISE NOTICE 'No system user found, skipping attendance record creation';
    END IF;
END $$;
