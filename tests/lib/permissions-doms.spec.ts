import { describe, expect, it } from 'vitest'
import {
  isDoms,
  isCaptain,
  isAdmin,
  canManageDomsShow,
  canSetDomsAvailabilityFor,
  canEditPastDomsShow,
  canEditShow,
} from '@/lib/permissions'

const doms = { id: 'd1', roles: ['doms'], team: null }
const captain = { id: 'c1', roles: ['member', 'captain'], team: 'Samurai' }
const member = { id: 'm1', roles: ['member'], team: 'Samurai' }
const viking = { id: 'v1', roles: ['member'], team: 'Viking' }

describe('doms role (spec-doms.md §2, §4.3)', () => {
  it('isDoms is only true for the doms role, which is neither captain nor admin', () => {
    expect(isDoms(doms)).toBe(true)
    expect(isDoms(captain)).toBe(false)
    expect(isCaptain(doms)).toBe(false)
    expect(isAdmin(doms)).toBe(false)
  })

  it('only a doms can manage doms shows (a captain never can)', () => {
    expect(canManageDomsShow(doms)).toBe(true)
    expect(canManageDomsShow(captain)).toBe(false)
    expect(canManageDomsShow(member)).toBe(false)
  })

  it('a doms cannot edit captain shows', () => {
    expect(canEditShow(doms, { team: 'Samurai' })).toBe(false)
  })

  describe('canSetDomsAvailabilityFor', () => {
    const show = { date: '2999-01-01', teams: ['Samurai', 'Gladiator'] }

    it('lets a member set their own availability when their team is targeted', () => {
      expect(canSetDomsAvailabilityFor(member, member, show)).toBe(true)
    })

    it('lets a captain set only their OWN availability (plain member for doms shows)', () => {
      expect(canSetDomsAvailabilityFor(captain, captain, show)).toBe(true)
      expect(canSetDomsAvailabilityFor(captain, member, show)).toBe(false)
    })

    it('lets a doms set a targeted member\'s availability', () => {
      expect(canSetDomsAvailabilityFor(doms, member, show)).toBe(true)
    })

    it('is false (N/A) when the target team is not targeted, even for a doms or self', () => {
      expect(canSetDomsAvailabilityFor(doms, viking, show)).toBe(false)
      expect(canSetDomsAvailabilityFor(viking, viking, show)).toBe(false)
    })
  })

  describe('canEditPastDomsShow', () => {
    it('allows everyone on a non-past show', () => {
      expect(canEditPastDomsShow(member, { date: '2999-01-01' })).toBe(true)
    })

    it('locks members AND captains out of past doms shows; doms may edit', () => {
      expect(canEditPastDomsShow(member, { date: '2020-01-01' })).toBe(false)
      expect(canEditPastDomsShow(captain, { date: '2020-01-01' })).toBe(false)
      expect(canEditPastDomsShow(doms, { date: '2020-01-01' })).toBe(true)
    })
  })
})
