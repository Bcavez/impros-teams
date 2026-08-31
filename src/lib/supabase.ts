import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

type Team = 'Samurai' | 'Gladiator' | 'Viking'
type AttendanceStatus = 'absent' | 'present' | 'undecided'

// Database types (spec.md §5), mirroring supabase/migrations/017_target_baseline.sql.
//
// `Relationships`/`Views`/`Functions`/`Enums`/`CompositeTypes` are required for this to satisfy
// @supabase/postgrest-js's `GenericSchema` constraint — without them, every table's Row/Insert
// type below silently collapses to `never` (surfaced only by `vue-tsc`, not at the call site).
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          slug: string
          roles: string[]
          team: Team | null
          must_change_password: boolean
          created_at: string
        }
        Insert: {
          id: string
          name: string
          roles?: string[]
          team?: Team | null
          must_change_password?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          roles?: string[]
          team?: Team | null
          must_change_password?: boolean
          created_at?: string
        }
        Relationships: []
      }
      coaching_sessions: {
        Row: {
          id: string
          date: string
          team: Team
          coach: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          team: Team
          coach: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          team?: Team
          coach?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          id: string
          user_id: string
          session_id: string
          status: AttendanceStatus
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id: string
          status?: AttendanceStatus
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string
          status?: AttendanceStatus
          updated_at?: string
        }
        Relationships: []
      }
      shows: {
        Row: {
          id: string
          name: string
          team: Team
          date: string
          max_cast: number
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          team: Team
          date: string
          max_cast?: number
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          team?: Team
          date?: string
          max_cast?: number
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      show_assignments: {
        Row: {
          id: string
          show_id: string
          user_id: string
        }
        Insert: {
          id?: string
          show_id: string
          user_id: string
        }
        Update: {
          id?: string
          show_id?: string
          user_id?: string
        }
        Relationships: []
      }
      show_availability: {
        Row: {
          id: string
          user_id: string
          show_id: string
          status: AttendanceStatus
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          show_id: string
          status?: AttendanceStatus
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          show_id?: string
          status?: AttendanceStatus
          updated_at?: string
        }
        Relationships: []
      }
    }
    // A string index signature here (e.g. `Record<string, never>`) would poison every
    // intersection with `Tables` in postgrest-js's `TablesAndViews` helper, collapsing every
    // table to `never` — mirror the Supabase CLI's own generated-types convention instead.
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
