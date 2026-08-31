import type { Row } from '../helpers/supabase-fake'
import { SAMURAI_CAPTAIN, SAMURAI_MEMBER_1 } from './users'
import { FUTURE_DATE, PAST_DATE } from './coaching'

// spec.md §5 — shows.date is folded directly onto the show row; there is no separate
// show_dates table. One row = one dated performance.

export const FUTURE_SHOW_DATE: Row = {
  id: 'show-future',
  name: 'Cabaret Hiver',
  team: 'Samurai',
  date: FUTURE_DATE,
  max_cast: 5,
  created_by: SAMURAI_CAPTAIN.id,
  created_at: '2026-01-01T00:00:00.000Z',
}

export const PAST_SHOW_DATE: Row = {
  id: 'show-past',
  name: 'Cabaret Automne',
  team: 'Samurai',
  date: PAST_DATE,
  max_cast: 5,
  created_by: SAMURAI_CAPTAIN.id,
  created_at: '2020-01-01T00:00:00.000Z',
}

export const ALL_SHOWS: Row[] = [FUTURE_SHOW_DATE, PAST_SHOW_DATE]

export const SHOW_ASSIGNMENTS: Row[] = [
  { id: 'assignment-1', show_id: FUTURE_SHOW_DATE.id, user_id: SAMURAI_MEMBER_1.id },
]

export const SHOW_AVAILABILITY: Row[] = [
  {
    id: 'availability-1',
    user_id: SAMURAI_MEMBER_1.id,
    show_id: FUTURE_SHOW_DATE.id,
    status: 'present',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
]
