import { useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { queryClient } from '@/lib/query-client'
import type { Team } from '@/lib/teams'

type Show = Database['public']['Tables']['shows']['Row']
type ShowAvailability = Database['public']['Tables']['show_availability']['Row']
type ShowAssignment = Database['public']['Tables']['show_assignments']['Row']

export const showsKey = (team?: Team | null) => ['shows', team ?? null] as const
export const showAssignmentsKey = () => ['show-assignments'] as const
export const showAvailabilityKey = () => ['show-availability'] as const

export async function fetchShows(team?: Team | null): Promise<Show[]> {
  let query = supabase.from('shows').select('*').order('date', { ascending: true })
  if (team) query = query.eq('team', team)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchShowAssignments(): Promise<ShowAssignment[]> {
  const { data, error } = await supabase.from('show_assignments').select('*')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchShowAvailability(): Promise<ShowAvailability[]> {
  const { data, error } = await supabase.from('show_availability').select('*')
  if (error) throw new Error(error.message)
  return data ?? []
}

export function useShowsQuery(team: MaybeRefOrGetter<Team | null | undefined>) {
  return useQuery(
    {
      queryKey: computed(() => showsKey(toValue(team))),
      queryFn: () => fetchShows(toValue(team)),
      enabled: computed(() => !!toValue(team)),
    },
    queryClient,
  )
}

export function useShowAssignmentsQuery() {
  return useQuery({ queryKey: showAssignmentsKey(), queryFn: fetchShowAssignments }, queryClient)
}

export function useShowAvailabilityQuery() {
  return useQuery({ queryKey: showAvailabilityKey(), queryFn: fetchShowAvailability }, queryClient)
}
