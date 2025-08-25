import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          role: 'admin' | 'captain' | 'member'
          team: 'Samurai' | 'Gladiator' | 'Viking' | null
          is_captain: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          role?: 'admin' | 'captain' | 'member'
          team?: 'Samurai' | 'Gladiator' | 'Viking' | null
          is_captain?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'admin' | 'captain' | 'member'
          team?: 'Samurai' | 'Gladiator' | 'Viking' | null
          is_captain?: boolean
          created_at?: string
        }
      }
      coaching_sessions: {
        Row: {
          id: string
          date: string
          team: 'Samurai' | 'Gladiator' | 'Viking'
          coach: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          team: 'Samurai' | 'Gladiator' | 'Viking'
          coach: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          team?: 'Samurai' | 'Gladiator' | 'Viking'
          coach?: string
          created_by?: string
          created_at?: string
        }
      }
      attendance_records: {
        Row: {
          id: string
          user_id: string
          session_id: string
          status: 'absent' | 'present' | 'undecided'
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id: string
          status: 'absent' | 'present' | 'undecided'
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string
          status?: 'absent' | 'present' | 'undecided'
          updated_at?: string
        }
      }
      shows: {
        Row: {
          id: string
          name: string
          team: 'Samurai' | 'Gladiator' | 'Viking'
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          team: 'Samurai' | 'Gladiator' | 'Viking'
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          team?: 'Samurai' | 'Gladiator' | 'Viking'
          created_by?: string
          created_at?: string
        }
      }
      show_dates: {
        Row: {
          id: string
          show_id: string
          date: string
          max_members: number
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          show_id: string
          date: string
          max_members?: number
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          show_id?: string
          date?: string
          max_members?: number
          created_by?: string
          created_at?: string
        }
      }
      show_assignments: {
        Row: {
          id: string
          show_date_id: string
          user_id: string
        }
        Insert: {
          id?: string
          show_date_id: string
          user_id: string
        }
        Update: {
          id?: string
          show_date_id?: string
          user_id?: string
        }
      }
      show_availability: {
        Row: {
          id: string
          user_id: string
          show_date_id: string
          status: 'absent' | 'present' | 'undecided'
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          show_date_id: string
          status: 'absent' | 'present' | 'undecided'
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          show_date_id?: string
          status?: 'absent' | 'present' | 'undecided'
          updated_at?: string
        }
      }
    }
  }
}
