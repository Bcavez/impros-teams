import type { Row } from '../helpers/supabase-fake'
import { slugify } from '@/lib/auth-identity'
import { FUTURE_DATE } from './coaching'

export const DOMS_USER: Row = {
  id: 'user-doms',
  name: 'Dora Doms',
  slug: slugify('Dora Doms'),
  roles: ['doms'],
  team: null,
  must_change_password: false,
  created_at: '2026-01-01T00:00:00.000Z',
}

/** A doms show targeting Samurai and Gladiator. */
export const DOMS_SHOW: Row = {
  id: 'doms-show-1',
  name: 'Gala Doms',
  date: FUTURE_DATE,
  created_by: DOMS_USER.id,
  created_at: '2026-01-01T00:00:00.000Z',
}

export const DOMS_SHOWS: Row[] = [DOMS_SHOW]

export const DOMS_SHOW_TEAMS: Row[] = [
  { show_id: DOMS_SHOW.id, team: 'Samurai' },
  { show_id: DOMS_SHOW.id, team: 'Gladiator' },
]

export const DOMS_SHOW_AVAILABILITY: Row[] = []
export const DOMS_SHOW_ASSIGNMENTS: Row[] = []
