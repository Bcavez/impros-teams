-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'captain', 'member')) DEFAULT 'member',
  team TEXT CHECK (team IN ('Samurai', 'Gladiator', 'Viking')),
  is_captain BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create coaching_sessions table
CREATE TABLE coaching_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  team TEXT NOT NULL CHECK (team IN ('Samurai', 'Gladiator', 'Viking')),
  coach TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attendance_records table
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES coaching_sessions(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('absent', 'present', 'undecided')) DEFAULT 'absent',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, session_id)
);

-- Create shows table
CREATE TABLE shows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  team TEXT NOT NULL CHECK (team IN ('Samurai', 'Gladiator', 'Viking')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create show_dates table
CREATE TABLE show_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  max_members INTEGER DEFAULT 5,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create show_assignments table
CREATE TABLE show_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_date_id UUID NOT NULL REFERENCES show_dates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(show_date_id, user_id)
);

-- Create show_availability table
CREATE TABLE show_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  show_date_id UUID NOT NULL REFERENCES show_dates(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('absent', 'present', 'undecided')) DEFAULT 'absent',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, show_date_id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_team ON users(team);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_coaching_sessions_team ON coaching_sessions(team);
CREATE INDEX idx_coaching_sessions_date ON coaching_sessions(date);
CREATE INDEX idx_attendance_records_session ON attendance_records(session_id);
CREATE INDEX idx_attendance_records_user ON attendance_records(user_id);
CREATE INDEX idx_shows_team ON shows(team);
CREATE INDEX idx_show_dates_show ON show_dates(show_id);
CREATE INDEX idx_show_dates_date ON show_dates(date);
CREATE INDEX idx_show_assignments_date ON show_assignments(show_date_id);
CREATE INDEX idx_show_availability_date ON show_availability(show_date_id);
CREATE INDEX idx_show_availability_user ON show_availability(user_id);

-- Insert sample data
INSERT INTO users (name, email, role, team, is_captain) VALUES
  ('Admin User', 'admin@example.com', 'admin', NULL, FALSE),
  ('Samurai Captain', 'samurai@example.com', 'captain', 'Samurai', TRUE),
  ('Gladiator Captain', 'gladiator@example.com', 'captain', 'Gladiator', TRUE),
  ('Viking Captain', 'viking@example.com', 'captain', 'Viking', TRUE),
  ('Samurai Member', 'member1@example.com', 'member', 'Samurai', FALSE),
  ('Samurai Member 2', 'member2@example.com', 'member', 'Samurai', FALSE),
  ('Gladiator Member', 'member3@example.com', 'member', 'Gladiator', FALSE),
  ('Viking Member', 'member4@example.com', 'member', 'Viking', FALSE);

-- Insert sample coaching sessions
INSERT INTO coaching_sessions (date, team, coach, created_by) VALUES
  ('2025-01-15', 'Samurai', 'Coach Sarah', (SELECT id FROM users WHERE email = 'samurai@example.com')),
  ('2025-01-20', 'Samurai', 'Coach Mike', (SELECT id FROM users WHERE email = 'samurai@example.com')),
  ('2025-01-18', 'Gladiator', 'Coach Alex', (SELECT id FROM users WHERE email = 'gladiator@example.com')),
  ('2025-02-05', 'Samurai', 'Coach Sarah', (SELECT id FROM users WHERE email = 'samurai@example.com')),
  ('2025-02-12', 'Gladiator', 'Coach Alex', (SELECT id FROM users WHERE email = 'gladiator@example.com')),
  ('2025-02-20', 'Viking', 'Coach Erik', (SELECT id FROM users WHERE email = 'viking@example.com'));

-- Insert sample shows
INSERT INTO shows (name, team, created_by) VALUES
  ('Winter Performance', 'Samurai', (SELECT id FROM users WHERE email = 'samurai@example.com')),
  ('Spring Festival', 'Gladiator', (SELECT id FROM users WHERE email = 'gladiator@example.com')),
  ('Summer Spectacular', 'Samurai', (SELECT id FROM users WHERE email = 'samurai@example.com')),
  ('Autumn Showcase', 'Gladiator', (SELECT id FROM users WHERE email = 'gladiator@example.com')),
  ('Viking Conquest', 'Viking', (SELECT id FROM users WHERE email = 'viking@example.com')),
  ('Holiday Special', 'Samurai', (SELECT id FROM users WHERE email = 'samurai@example.com'));

-- Insert sample show dates
INSERT INTO show_dates (show_id, date, created_by) VALUES
  ((SELECT id FROM shows WHERE name = 'Winter Performance'), '2025-02-15', (SELECT id FROM users WHERE email = 'samurai@example.com')),
  ((SELECT id FROM shows WHERE name = 'Spring Festival'), '2025-03-20', (SELECT id FROM users WHERE email = 'gladiator@example.com')),
  ((SELECT id FROM shows WHERE name = 'Summer Spectacular'), '2025-06-15', (SELECT id FROM users WHERE email = 'samurai@example.com')),
  ((SELECT id FROM shows WHERE name = 'Autumn Showcase'), '2025-09-10', (SELECT id FROM users WHERE email = 'gladiator@example.com')),
  ((SELECT id FROM shows WHERE name = 'Viking Conquest'), '2025-07-04', (SELECT id FROM users WHERE email = 'viking@example.com')),
  ((SELECT id FROM shows WHERE name = 'Holiday Special'), '2025-12-20', (SELECT id FROM users WHERE email = 'samurai@example.com'));

-- Insert sample attendance records
INSERT INTO attendance_records (user_id, session_id, status) VALUES
  ((SELECT id FROM users WHERE email = 'member1@example.com'), (SELECT id FROM coaching_sessions WHERE date = '2025-01-15' AND team = 'Samurai'), 'present'),
  ((SELECT id FROM users WHERE email = 'member2@example.com'), (SELECT id FROM coaching_sessions WHERE date = '2025-01-15' AND team = 'Samurai'), 'present'),
  ((SELECT id FROM users WHERE email = 'member3@example.com'), (SELECT id FROM coaching_sessions WHERE date = '2025-01-18' AND team = 'Gladiator'), 'present'),
  ((SELECT id FROM users WHERE email = 'member4@example.com'), (SELECT id FROM coaching_sessions WHERE date = '2025-02-20' AND team = 'Viking'), 'present');

-- Insert sample show assignments
INSERT INTO show_assignments (show_date_id, user_id) VALUES
  ((SELECT id FROM show_dates WHERE date = '2025-02-15'), (SELECT id FROM users WHERE email = 'member1@example.com')),
  ((SELECT id FROM show_dates WHERE date = '2025-02-15'), (SELECT id FROM users WHERE email = 'member2@example.com')),
  ((SELECT id FROM show_dates WHERE date = '2025-03-20'), (SELECT id FROM users WHERE email = 'member3@example.com')),
  ((SELECT id FROM show_dates WHERE date = '2025-07-04'), (SELECT id FROM users WHERE email = 'member4@example.com'));

-- Insert sample show availability
INSERT INTO show_availability (user_id, show_date_id, status) VALUES
  ((SELECT id FROM users WHERE email = 'member1@example.com'), (SELECT id FROM show_dates WHERE date = '2025-02-15'), 'present'),
  ((SELECT id FROM users WHERE email = 'member2@example.com'), (SELECT id FROM show_dates WHERE date = '2025-02-15'), 'undecided'),
  ((SELECT id FROM users WHERE email = 'member3@example.com'), (SELECT id FROM show_dates WHERE date = '2025-03-20'), 'present'),
  ((SELECT id FROM users WHERE email = 'member4@example.com'), (SELECT id FROM show_dates WHERE date = '2025-07-04'), 'present');

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_availability ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can see all users (for team management)
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Only admins can insert/delete users
CREATE POLICY "Only admins can insert users" ON users FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
);

CREATE POLICY "Only admins can delete users" ON users FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- Team-based access for coaching sessions
CREATE POLICY "Team members can view coaching sessions" ON coaching_sessions FOR SELECT USING (
  team = (SELECT team FROM users WHERE id::text = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
);

CREATE POLICY "Captains and admins can manage coaching sessions" ON coaching_sessions FOR ALL USING (
  created_by::text = auth.uid()::text
  OR EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  OR EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'captain' AND team = coaching_sessions.team)
);

-- Similar policies for other tables...
-- (I'll create a separate migration for the remaining RLS policies to keep this manageable)
