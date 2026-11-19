import { describe, expect, it } from 'vitest'
import {
  buildDomsCoachingMatrix,
  buildDomsShowsMatrix,
  groupMembersByTeam,
  mergeCoachingDates,
  toDomsViewShows,
  type DomsMember,
  type DomsSession,
} from '@/lib/doms'

const members: DomsMember[] = [
  { id: 'v1', name: 'Zed Viking', team: 'Viking' },
  { id: 's2', name: 'Bob Samurai', team: 'Samurai' },
  { id: 's1', name: 'Ann Samurai', team: 'Samurai' },
  { id: 'g1', name: 'Gus Gladiator', team: 'Gladiator' },
  { id: 'none', name: 'No Team', team: null },
]

const session = (id: string, date: string, team: DomsSession['team'], created_at = '2026-01-01T00:00:00Z'): DomsSession => ({
  id,
  date,
  team,
  created_at,
})

describe('groupMembersByTeam', () => {
  it('groups in TEAMS order, sorts by name, drops team-less members', () => {
    const groups = groupMembersByTeam(members)
    expect(groups.map((g) => g.team)).toEqual(['Samurai', 'Gladiator', 'Viking'])
    expect(groups[0].members.map((m) => m.id)).toEqual(['s1', 's2'])
    expect(groups.flatMap((g) => g.members).some((m) => m.id === 'none')).toBe(false)
  })
})

describe('mergeCoachingDates (spec-doms.md §6.3)', () => {
  it('keeps only dates where all three teams have a session', () => {
    const merged = mergeCoachingDates([
      session('a', '2026-03-01', 'Samurai'),
      session('b', '2026-03-01', 'Gladiator'),
      session('c', '2026-03-01', 'Viking'),
      session('d', '2026-03-08', 'Samurai'),
      session('e', '2026-03-08', 'Gladiator'),
    ])
    expect(merged.map((m) => m.date)).toEqual(['2026-03-01'])
    expect(merged[0].sessionByTeam).toEqual({ Samurai: 'a', Gladiator: 'b', Viking: 'c' })
  })

  it('uses the earliest-created session when a team has two on the same date', () => {
    const merged = mergeCoachingDates([
      session('late', '2026-03-01', 'Samurai', '2026-02-02T00:00:00Z'),
      session('early', '2026-03-01', 'Samurai', '2026-01-01T00:00:00Z'),
      session('b', '2026-03-01', 'Gladiator'),
      session('c', '2026-03-01', 'Viking'),
    ])
    expect(merged[0].sessionByTeam.Samurai).toBe('early')
  })

  it('returns dates in ascending order', () => {
    const all = (date: string, p: string) => [
      session(`${p}s`, date, 'Samurai'),
      session(`${p}g`, date, 'Gladiator'),
      session(`${p}v`, date, 'Viking'),
    ]
    const merged = mergeCoachingDates([...all('2026-05-01', 'x'), ...all('2026-04-01', 'y')])
    expect(merged.map((m) => m.date)).toEqual(['2026-04-01', '2026-05-01'])
  })
})

describe('buildDomsShowsMatrix (spec-doms.md §6.2)', () => {
  const shows = toDomsViewShows(
    [{ id: 'c1', name: 'Captain Show', date: '2026-06-01', team: 'Samurai' }],
    [{ id: 'd1', name: 'Doms Show', date: '2026-06-02' }],
    [
      { show_id: 'd1', team: 'Samurai' },
      { show_id: 'd1', team: 'Viking' },
    ],
  )

  const rows = buildDomsShowsMatrix(
    members,
    shows,
    { captain: [{ user_id: 's1', show_id: 'c1', status: 'present' }], doms: [{ user_id: 'v1', show_id: 'd1', status: 'absent' }] },
    { captain: [{ user_id: 's1', show_id: 'c1' }], doms: [{ user_id: 's2', show_id: 'd1' }] },
  )
  const cell = (memberId: string, showKey: string) =>
    rows.find((r) => r.member.id === memberId)!.cells.find((c) => c.showKey === showKey)!

  it('normalizes captain and doms shows into one list sorted by date', () => {
    expect(shows.map((s) => s.key)).toEqual(['captain|c1', 'doms|d1'])
    expect(shows[1].teams).toEqual(['Samurai', 'Viking'])
  })

  it('marks cells N/A when the member current team is not a target', () => {
    expect(cell('g1', 'captain|c1').applicable).toBe(false) // Gladiator vs Samurai captain show
    expect(cell('g1', 'doms|d1').applicable).toBe(false) // Gladiator not targeted by the doms show
    expect(cell('v1', 'captain|c1').applicable).toBe(false)
    expect(cell('v1', 'doms|d1').applicable).toBe(true)
  })

  it('reads availability per kind, falling back to undecided', () => {
    expect(cell('s1', 'captain|c1').status).toBe('present')
    expect(cell('v1', 'doms|d1').status).toBe('absent')
    expect(cell('s1', 'doms|d1').status).toBe('undecided')
  })

  it('marks cast members with inCast, for both kinds', () => {
    expect(cell('s1', 'captain|c1').inCast).toBe(true)
    expect(cell('s2', 'doms|d1').inCast).toBe(true)
    expect(cell('s2', 'captain|c1').inCast).toBe(false)
  })

  it('orders rows by team then name and excludes team-less members', () => {
    expect(rows.map((r) => r.member.id)).toEqual(['s1', 's2', 'g1', 'v1'])
  })
})

describe('buildDomsCoachingMatrix (spec-doms.md §6.3)', () => {
  const merged = mergeCoachingDates([
    ...['2020-01-01', '2020-01-08', '2999-01-01'].flatMap((d) => [
      session(`${d}-s`, d, 'Samurai'),
      session(`${d}-g`, d, 'Gladiator'),
      session(`${d}-v`, d, 'Viking'),
    ]),
  ])

  const rows = buildDomsCoachingMatrix(
    members,
    merged,
    [
      { user_id: 's1', session_id: '2020-01-01-s', status: 'absent' },
      { user_id: 'g1', session_id: '2020-01-08-g', status: 'undecided' },
    ],
    new Date(2026, 0, 1),
  )
  const row = (id: string) => rows.find((r) => r.member.id === id)!

  it('uses the member own-team session and falls back to present', () => {
    expect(row('s1').cells.map((c) => c.status)).toEqual(['absent', 'present', 'present'])
    expect(row('g1').cells.map((c) => c.status)).toEqual(['present', 'undecided', 'present'])
  })

  it('summarises present/total over merged dates up to today only', () => {
    expect(row('s1').summary).toEqual({ present: 1, total: 2 })
    expect(row('g1').summary).toEqual({ present: 1, total: 2 })
  })
})


