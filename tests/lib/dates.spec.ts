import { describe, expect, it } from 'vitest'

// spec.md §7.2 — src/lib/permissions.ts's isPastDate is the single place date-only strings
// ('YYYY-MM-DD') are compared against "today". Red until created.
//
// Regression guard: the current codebase mixes `date-fns`'s `parseISO` (parses a date-only
// string as LOCAL midnight — correct) with plain `new Date(dateString)` (parsed as UTC
// midnight per the JS spec — one calendar day off in any timezone behind UTC) in the same
// views, e.g. CaptainDashboardView.vue:467-470 vs TeamDashboardView.vue:220-227.
import { isPastDate } from '@/lib/permissions'

describe('isPastDate (spec.md §7.2)', () => {
  it('treats a date-only string as a calendar date, not an instant', () => {
    const today = new Date('2026-06-15T23:59:00')
    expect(isPastDate('2026-06-15', today)).toBe(false)
  })

  it('is not affected by the caller\'s timezone offset for a date far in the past', () => {
    expect(isPastDate('2020-01-01', new Date('2026-01-01T00:00:00'))).toBe(true)
  })

  it('is not affected by the caller\'s timezone offset for a date far in the future', () => {
    expect(isPastDate('2999-01-01', new Date('2026-01-01T00:00:00'))).toBe(false)
  })

  it('treats today itself as not past', () => {
    const today = new Date('2026-06-15T08:00:00')
    expect(isPastDate('2026-06-15', today)).toBe(false)
  })

  it('treats yesterday as past regardless of the time of day "now" represents', () => {
    const today = new Date('2026-06-15T00:00:01')
    expect(isPastDate('2026-06-14', today)).toBe(true)
  })
})
