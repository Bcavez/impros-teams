import { describe, expect, it } from 'vitest'
import { groupShowsByDate, type ViewShow } from '@/lib/doms'

const show = (id: string, kind: ViewShow['kind'], date: string, team: ViewShow['teams'][number]): ViewShow => ({
  key: `${kind}|${id}`,
  kind,
  id,
  name: id,
  date,
  teams: [team],
})

describe('groupShowsByDate', () => {
  it('merges shows of different teams sharing a date into one column, ascending by date', () => {
    const columns = groupShowsByDate([
      show('b', 'captain', '2027-01-09', 'Viking'),
      show('a', 'captain', '2026-12-05', 'Samurai'),
      show('c', 'captain', '2027-01-09', 'Gladiator'),
    ])

    expect(columns.map((c) => c.date)).toEqual(['2026-12-05', '2027-01-09'])
    expect(columns[1].shows.map((s) => s.id)).toEqual(['b', 'c'])
  })

  it('never merges a doms show: it keeps its own column even on a shared date', () => {
    const columns = groupShowsByDate([
      show('a', 'captain', '2026-12-05', 'Samurai'),
      show('c', 'captain', '2026-12-05', 'Gladiator'),
      show('d', 'doms', '2026-12-05', 'Viking'),
      show('e', 'doms', '2026-12-05', 'Samurai'),
    ])

    expect(columns.map((c) => c.shows.map((s) => s.id))).toEqual([['a', 'c'], ['d'], ['e']])
    expect(columns.map((c) => c.hasDoms)).toEqual([false, true, true])
    expect(new Set(columns.map((c) => c.key)).size).toBe(3)
  })
})