import { useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/query-client'
import type { Team } from '@/lib/teams'

export interface TeamMember {
  id: string
  name: string
  team: Team | null
}

export const teamMembersKey = (team?: Team | null) => ['team-members', team ?? null] as const

export async function fetchTeamMembers(team?: Team | null): Promise<TeamMember[]> {
  if (!team) return []
  const { data, error } = await supabase.from('profiles').select('id, name, team').eq('team', team)
  if (error) throw new Error(error.message)
  return (data ?? []) as TeamMember[]
}

/** Team-scoped read for use directly in components (spec.md Stage 3), replacing the
 * hand-rolled `teamMembersCache` that used to live inside the coaching/shows stores. */
export function useTeamMembersQuery(team: MaybeRefOrGetter<Team | null | undefined>) {
  return useQuery(
    {
      queryKey: computed(() => teamMembersKey(toValue(team))),
      queryFn: () => fetchTeamMembers(toValue(team)),
      enabled: computed(() => !!toValue(team)),
    },
    queryClient,
  )
}
