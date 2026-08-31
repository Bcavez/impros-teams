import { describe, expect, it } from 'vitest'

// spec.md §3 — src/lib/teams.ts does not exist yet; this whole file is red until it is created.
// It replaces the `'Samurai' | 'Gladiator' | 'Viking'` union duplicated ~20 times across
// src/lib/supabase.ts and all three stores today.
import { TEAMS, type Team } from '@/lib/teams'

describe('TEAMS (spec.md §3)', () => {
  it('lists exactly the three fixed teams', () => {
    expect(TEAMS).toEqual(['Samurai', 'Gladiator', 'Viking'])
  })

  it('is readonly at the type level (compile-time check, no runtime assertion needed)', () => {
    const team: Team = 'Samurai'
    expect(TEAMS).toContain(team)
  })

  it('is frozen so it cannot be mutated at runtime', () => {
    expect(Object.isFrozen(TEAMS)).toBe(true)
  })
})
