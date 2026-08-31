import { useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { queryClient } from '@/lib/query-client'
import type { Team } from '@/lib/teams'

type CoachingSession = Database['public']['Tables']['coaching_sessions']['Row']
type AttendanceRow = Database['public']['Tables']['attendance_records']['Row']

export const coachingSessionsKey = (team?: Team | null) => ['coaching-sessions', team ?? null] as const
export const attendanceRecordsKey = () => ['attendance-records'] as const

export async function fetchCoachingSessions(team?: Team | null): Promise<CoachingSession[]> {
  let query = supabase.from('coaching_sessions').select('*').order('date', { ascending: false })
  if (team) query = query.eq('team', team)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchAttendanceRecords(): Promise<AttendanceRow[]> {
  const { data, error } = await supabase.from('attendance_records').select('*')
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Team-scoped read for use directly in components (spec.md Stage 3). */
export function useCoachingSessionsQuery(team: MaybeRefOrGetter<Team | null | undefined>) {
  return useQuery(
    {
      queryKey: computed(() => coachingSessionsKey(toValue(team))),
      queryFn: () => fetchCoachingSessions(toValue(team)),
      enabled: computed(() => !!toValue(team)),
    },
    queryClient,
  )
}

export function useAttendanceRecordsQuery() {
  return useQuery(
    {
      queryKey: attendanceRecordsKey(),
      queryFn: fetchAttendanceRecords,
    },
    queryClient,
  )
}
