import type { Row } from '../helpers/supabase-fake'
import { SAMURAI_CAPTAIN, SAMURAI_MEMBER_1, SAMURAI_MEMBER_2 } from './users'

/** ISO date strings kept far in the past/future so "today" comparisons are stable in CI. */
export const PAST_DATE = '2020-01-05'
export const FUTURE_DATE = '2999-01-05'

export const PAST_SESSION: Row = {
  id: 'session-past',
  date: PAST_DATE,
  team: 'Samurai',
  coach: 'Coach Past',
  created_by: SAMURAI_CAPTAIN.id,
  created_at: '2020-01-01T00:00:00.000Z',
}

export const FUTURE_SESSION: Row = {
  id: 'session-future',
  date: FUTURE_DATE,
  team: 'Samurai',
  coach: 'Coach Future',
  created_by: SAMURAI_CAPTAIN.id,
  created_at: '2026-01-01T00:00:00.000Z',
}

export const ALL_SESSIONS: Row[] = [PAST_SESSION, FUTURE_SESSION]

export const ATTENDANCE_RECORDS: Row[] = [
  {
    id: 'attendance-1',
    user_id: SAMURAI_MEMBER_1.id,
    session_id: FUTURE_SESSION.id,
    status: 'present',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'attendance-2',
    user_id: SAMURAI_MEMBER_2.id,
    session_id: FUTURE_SESSION.id,
    status: 'absent',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
]
