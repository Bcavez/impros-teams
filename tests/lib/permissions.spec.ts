import { describe, expect, it } from 'vitest'

// spec.md §2, §7 — src/lib/permissions.ts does not exist yet; red until created.
// These are pure predicates with no I/O, so they are the cheapest, most durable place to pin
// down the authorization rules — stores and RLS policies are both expected to defer to these
// same rules rather than re-implement them.
import {
  isAdmin,
  isCaptain,
  isCaptainOfTeam,
  canEditCoachingSession,
  canEditShow,
  canSetAttendanceFor,
  canEditPastEvent,
} from '@/lib/permissions'

type TargetUser = { id: string; roles: string[]; team: string | null }

const admin: TargetUser = { id: 'admin-1', roles: ['member', 'admin'], team: null }
const samuraiCaptain: TargetUser = { id: 'captain-1', roles: ['member', 'captain'], team: 'Samurai' }
const gladiatorCaptain: TargetUser = { id: 'captain-2', roles: ['member', 'captain'], team: 'Gladiator' }
const samuraiMember: TargetUser = { id: 'member-1', roles: ['member'], team: 'Samurai' }
const adminAndCaptain: TargetUser = {
  id: 'both-1',
  roles: ['member', 'admin', 'captain'],
  team: 'Samurai',
}

describe('role model (spec.md §2)', () => {
  it('isAdmin is true only for users whose roles include admin', () => {
    expect(isAdmin(admin)).toBe(true)
    expect(isAdmin(samuraiCaptain)).toBe(false)
    expect(isAdmin(samuraiMember)).toBe(false)
  })

  it('isCaptain does NOT treat admin as an implicit captain', () => {
    expect(isCaptain(admin)).toBe(false)
    expect(isCaptain(samuraiCaptain)).toBe(true)
    expect(isCaptain(samuraiMember)).toBe(false)
  })

  it('a user can hold both admin and captain roles simultaneously without contradiction', () => {
    expect(isAdmin(adminAndCaptain)).toBe(true)
    expect(isCaptain(adminAndCaptain)).toBe(true)
  })

  it('isCaptainOfTeam requires both the captain role and a matching team', () => {
    expect(isCaptainOfTeam(samuraiCaptain, 'Samurai')).toBe(true)
    expect(isCaptainOfTeam(samuraiCaptain, 'Gladiator')).toBe(false)
    expect(isCaptainOfTeam(samuraiMember, 'Samurai')).toBe(false)
    expect(isCaptainOfTeam(admin, 'Samurai')).toBe(false)
  })
})

describe('coaching/show mutation authorization (spec.md §7.1)', () => {
  const samuraiSession = { team: 'Samurai' as const }
  const samuraiShow = { team: 'Samurai' as const }

  it('a captain may edit their own team\'s coaching session', () => {
    expect(canEditCoachingSession(samuraiCaptain, samuraiSession)).toBe(true)
  })

  it('a captain may NOT edit another team\'s coaching session', () => {
    expect(canEditCoachingSession(gladiatorCaptain, samuraiSession)).toBe(false)
  })

  it('a member may never edit a coaching session', () => {
    expect(canEditCoachingSession(samuraiMember, samuraiSession)).toBe(false)
  })

  it('an admin (without the captain role) may NOT edit a coaching session', () => {
    expect(canEditCoachingSession(admin, samuraiSession)).toBe(false)
  })

  it('the same rules apply to shows', () => {
    expect(canEditShow(samuraiCaptain, samuraiShow)).toBe(true)
    expect(canEditShow(gladiatorCaptain, samuraiShow)).toBe(false)
    expect(canEditShow(samuraiMember, samuraiShow)).toBe(false)
    expect(canEditShow(admin, samuraiShow)).toBe(false)
  })
})

describe('canSetAttendanceFor (spec.md §7.1)', () => {
  const samuraiSession = { team: 'Samurai' as const, date: '2999-01-01' }

  it('a member may set their own attendance', () => {
    expect(canSetAttendanceFor(samuraiMember, samuraiMember.id, samuraiSession)).toBe(true)
  })

  it('a member may NOT set another member\'s attendance', () => {
    expect(canSetAttendanceFor(samuraiMember, 'someone-else', samuraiSession)).toBe(false)
  })

  it('a captain may set any of their own team\'s members\' attendance', () => {
    expect(canSetAttendanceFor(samuraiCaptain, samuraiMember.id, samuraiSession)).toBe(true)
  })

  it('a captain of a different team may not set attendance for this session', () => {
    expect(canSetAttendanceFor(gladiatorCaptain, samuraiMember.id, samuraiSession)).toBe(false)
  })
})

describe('past-event lock (spec.md §7.2)', () => {
  const pastEvent = { date: '2020-01-01' }
  const futureEvent = { date: '2999-01-01' }

  it('a member cannot edit a past event', () => {
    expect(canEditPastEvent(samuraiMember, pastEvent)).toBe(false)
  })

  it('a member can edit a future event', () => {
    expect(canEditPastEvent(samuraiMember, futureEvent)).toBe(true)
  })

  it('a captain can edit a past event (to record what actually happened)', () => {
    expect(canEditPastEvent(samuraiCaptain, pastEvent)).toBe(true)
  })

  it('the rule does not depend on any caller-supplied role argument (only on the user object)', () => {
    // Regression guard for the current bug: src/stores/coaching.ts:187 only enforces this
    // when the caller *chooses* to pass `currentUserRole`. The target predicate takes the
    // authenticated user object and nothing else can override it.
    expect(canEditPastEvent.length).toBe(2)
  })
})
