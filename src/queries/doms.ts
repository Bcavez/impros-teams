import { useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { queryClient } from '@/lib/query-client'
import type { Team } from '@/lib/teams'
import type { DomsMember } from '@/lib/doms'

type DomsShow = Database['public']['Tables']['doms_shows']['Row']
type DomsShowTeam = Database['public']['Tables']['doms_show_teams']['Row']
type DomsAvailability = Database['public']['Tables']['doms_show_availability']['Row']
type DomsAssignment = Database['public']['Tables']['doms_show_assignments']['Row']

export interface DomsCastMember {
  user_id: string
  name: string
  team: string
}

/** `team` = member-scoped (shows targeting that team); omitted/null = every doms show (doms view). */
export const domsShowsKey = (team?: Team | null) => ['doms-shows', team ?? 'all'] as const
export const domsShowTeamsKey = () => ['doms-show-teams'] as const
export const domsAvailabilityKey = () => ['doms-show-availability'] as const
export const domsAssignmentsKey = () => ['doms-show-assignments'] as const
export const domsMembersKey = () => ['doms-members'] as const
export const domsCastKey = (showId: string) => ['doms-show-cast', showId] as const

export async function fetchDomsShowTeams(): Promise<DomsShowTeam[]> {
  const { data, error } = await supabase.from('doms_show_teams').select('*')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchDomsShows(team?: Team | null): Promise<DomsShow[]> {
  let ids: string[] | null = null
  if (team) {
    const { data, error } = await supabase.from('doms_show_teams').select('*').eq('team', team)
    if (error) throw new Error(error.message)
    ids = (data ?? []).map((r: DomsShowTeam) => r.show_id)
    if (ids.length === 0) return []
  }
  let query = supabase.from('doms_shows').select('*').order('date', { ascending: true })
  if (ids) query = query.in('id', ids)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchDomsAvailability(): Promise<DomsAvailability[]> {
  const { data, error } = await supabase.from('doms_show_availability').select('*')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchDomsAssignments(): Promise<DomsAssignment[]> {
  const { data, error } = await supabase.from('doms_show_assignments').select('*')
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Every profile that has a team (RLS lets a doms read all profiles; teamless/doms are filtered out). */
export async function fetchDomsMembers(): Promise<DomsMember[]> {
  const { data, error } = await supabase.from('profiles').select('id, name, team')
  if (error) throw new Error(error.message)
  return ((data ?? []) as DomsMember[]).filter((m) => m.team !== null)
}

export async function fetchDomsCast(showId: string): Promise<DomsCastMember[]> {
  const { data, error } = await supabase.rpc('doms_show_cast', { p_show_id: showId })
  if (error) throw new Error(error.message)
  return (data ?? []) as DomsCastMember[]
}

export function useDomsShowsQuery(team: MaybeRefOrGetter<Team | null | undefined>) {
  return useQuery(
    {
      queryKey: computed(() => domsShowsKey(toValue(team))),
      queryFn: () => fetchDomsShows(toValue(team)),
    },
    queryClient,
  )
}
