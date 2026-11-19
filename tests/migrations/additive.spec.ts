import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Guard: 020 runs against the production database that the deployed app also uses, so it must
// stay purely additive (spec-doms.md §0).
const sql = readFileSync(resolve(__dirname, '../../supabase/migrations/020_doms_additive.sql'), 'utf8')
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .toLowerCase()

const NEW_TABLES = ['doms_shows', 'doms_show_teams', 'doms_show_availability', 'doms_show_assignments']
const EXISTING_TABLES = [
  'profiles',
  'coaching_sessions',
  'attendance_records',
  'shows',
  'show_assignments',
  'show_availability',
]

describe('020_doms_additive.sql is backward compatible', () => {
  it('never drops, truncates, or replaces anything', () => {
    expect(sql).not.toMatch(/\bdrop\s+(table|column|policy|function|constraint|trigger)\b/)
    expect(sql).not.toMatch(/\btruncate\b/)
    expect(sql).not.toMatch(/\bcreate\s+or\s+replace\b/)
    expect(sql).not.toMatch(/\bcreate\s+\w+\s+if\s+not\s+exists\b/)
  })

  it('never writes to existing tables', () => {
    for (const table of EXISTING_TABLES) {
      expect(sql).not.toMatch(new RegExp(`\\bupdate\\s+${table}\\b`))
      expect(sql).not.toMatch(new RegExp(`\\bdelete\\s+from\\s+${table}\\b`))
      expect(sql).not.toMatch(new RegExp(`\\binsert\\s+into\\s+${table}\\b`))
    }
  })

  it('only alters the new tables (to enable RLS)', () => {
    const alters = [...sql.matchAll(/\balter\s+table\s+(\w+)/g)].map((m) => m[1])
    expect(alters.length).toBeGreaterThan(0)
    for (const table of alters) expect(NEW_TABLES).toContain(table)
  })

  it('only adds doms-gated SELECT policies to existing tables', () => {
    const policies = [...sql.matchAll(/create\s+policy\s+\w+\s+on\s+(\w+)\s+for\s+(\w+)\s+using\s*\(([^;]*?)\)\s*;/g)]
    const onExisting = policies.filter((m) => EXISTING_TABLES.includes(m[1]))
    expect(onExisting).toHaveLength(EXISTING_TABLES.length)
    for (const [, , command, condition] of onExisting) {
      expect(command).toBe('select')
      expect(condition.trim()).toBe('current_user_is_doms()')
    }

    // Any policy statement targeting an existing table must be one of the above.
    const allOnExisting = [...sql.matchAll(/create\s+policy\s+\w+\s+on\s+(\w+)/g)].filter((m) =>
      EXISTING_TABLES.includes(m[1]),
    )
    expect(allOnExisting).toHaveLength(EXISTING_TABLES.length)
  })

  it('does not add columns, constraints, or triggers to existing tables', () => {
    expect(sql).not.toMatch(/\bcreate\s+trigger\b/)
    expect(sql).not.toMatch(/\badd\s+(column|constraint)\b/)
  })
})
