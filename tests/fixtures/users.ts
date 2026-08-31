/**
 * Fixtures matching the TARGET `profiles` schema (spec.md §5, supabase/migrations/
 * 017_target_baseline.sql). Slugs are precomputed with the same rule as
 * src/lib/auth-identity.ts's slugify so the fake auth layer's synthetic-email login matches.
 */
import type { Row } from '../helpers/supabase-fake'
import { slugify } from '@/lib/auth-identity'

export const ADMIN_USER: Row = {
  id: 'user-admin',
  name: 'Alice Admin',
  slug: slugify('Alice Admin'),
  roles: ['member', 'admin'],
  team: null,
  must_change_password: false,
  created_at: '2026-01-01T00:00:00.000Z',
}

export const SAMURAI_CAPTAIN: Row = {
  id: 'user-samurai-captain',
  name: 'Cate Captain',
  slug: slugify('Cate Captain'),
  roles: ['member', 'captain'],
  team: 'Samurai',
  must_change_password: false,
  created_at: '2026-01-01T00:00:00.000Z',
}

export const SAMURAI_MEMBER_1: Row = {
  id: 'user-samurai-1',
  name: 'Marc Member',
  slug: slugify('Marc Member'),
  roles: ['member'],
  team: 'Samurai',
  must_change_password: false,
  created_at: '2026-01-01T00:00:00.000Z',
}

export const SAMURAI_MEMBER_2: Row = {
  id: 'user-samurai-2',
  name: 'Nina Nouvelle',
  slug: slugify('Nina Nouvelle'),
  roles: ['member'],
  team: 'Samurai',
  must_change_password: false,
  created_at: '2026-01-01T00:00:00.000Z',
}

export const GLADIATOR_MEMBER: Row = {
  id: 'user-gladiator-1',
  name: 'Gino Gladiateur',
  slug: slugify('Gino Gladiateur'),
  roles: ['member'],
  team: 'Gladiator',
  must_change_password: false,
  created_at: '2026-01-01T00:00:00.000Z',
}

export const UNASSIGNED_MEMBER: Row = {
  id: 'user-unassigned',
  name: 'Uma Unassigned',
  slug: slugify('Uma Unassigned'),
  roles: ['member'],
  team: null,
  must_change_password: false,
  created_at: '2026-01-01T00:00:00.000Z',
}

export const ALL_USERS: Row[] = [
  ADMIN_USER,
  SAMURAI_CAPTAIN,
  SAMURAI_MEMBER_1,
  SAMURAI_MEMBER_2,
  GLADIATOR_MEMBER,
  UNASSIGNED_MEMBER,
]
