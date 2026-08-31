/**
 * In-memory fake of the subset of the Supabase JS client this app uses:
 * the chainable `.from().select().eq().order().single()` query builder,
 * and `.auth.*` for the target-state Supabase Auth flows.
 *
 * Goals:
 * - Behave like real Postgres/PostgREST closely enough that store tests
 *   exercise real logic (filtering, ordering, uniqueness, `.single()`
 *   error semantics) instead of one-off `vi.fn()` return values.
 * - Stay small and dependency-free so it's easy to reason about and extend.
 *
 * This fake does NOT implement Row Level Security. RLS is a specification
 * concern (see spec.md §7) verified by policy review, not by this fake.
 */

import { slugify } from '@/lib/auth-identity'

export type Row = Record<string, unknown>

interface TableDef {
  rows: Row[]
  uniques?: string[][]
}

type FilterOp = { column: string; op: 'eq' | 'neq' | 'in'; value: unknown }

export class FakeQueryError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

class QueryBuilder {
  private filters: FilterOp[] = []
  private orderBy: { column: string; ascending: boolean } | null = null
  private selectedColumns: string | null = null
  private pendingInsert: Row[] | null = null
  private pendingUpdate: Row | null = null
  private pendingDelete = false
  private pendingUpsert: { values: Row[]; onConflict?: string } | null = null

  constructor(
    private readonly db: FakeSupabaseDatabase,
    private readonly table: string,
  ) {}

  select(columns = '*') {
    this.selectedColumns = columns
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, op: 'eq', value })
    return this
  }

  neq(column: string, value: unknown) {
    this.filters.push({ column, op: 'neq', value })
    return this
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ column, op: 'in', value: values })
    return this
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: opts?.ascending ?? true }
    return this
  }

  insert(values: Row | Row[]) {
    this.pendingInsert = Array.isArray(values) ? values : [values]
    return this
  }

  update(values: Row) {
    this.pendingUpdate = values
    return this
  }

  /** Mirrors `.upsert(values, { onConflict: 'col1,col2' })` — matches an existing row on the
   * conflict columns and merges into it, or inserts a new row otherwise. */
  upsert(values: Row | Row[], opts?: { onConflict?: string }) {
    this.pendingUpsert = { values: Array.isArray(values) ? values : [values], onConflict: opts?.onConflict }
    return this
  }

  delete() {
    this.pendingDelete = true
    return this
  }

  private matches(row: Row): boolean {
    return this.filters.every((f) => {
      if (f.op === 'eq') return row[f.column] === f.value
      if (f.op === 'neq') return row[f.column] !== f.value
      if (f.op === 'in') return (f.value as unknown[]).includes(row[f.column])
      return true
    })
  }

  private applyOrder(rows: Row[]): Row[] {
    if (!this.orderBy) return rows
    const { column, ascending } = this.orderBy
    return [...rows].sort((a, b) => {
      const av = a[column] as string | number
      const bv = b[column] as string | number
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return ascending ? cmp : -cmp
    })
  }

  private resolveSync(): { data: Row[] | null; error: FakeQueryError | null } {
    const def = this.db.table(this.table)

    if (this.pendingUpsert) {
      const conflictCols = this.pendingUpsert.onConflict?.split(',').map((c) => c.trim())
      const results: Row[] = []
      for (const partial of this.pendingUpsert.values) {
        const existing = conflictCols
          ? def.rows.find((row) => conflictCols.every((c) => row[c] === partial[c]))
          : undefined

        if (existing) {
          Object.assign(existing, partial)
          results.push(existing)
        } else {
          const row: Row = {
            id: partial.id ?? `${this.table}-${def.rows.length + results.length + 1}`,
            created_at: partial.created_at ?? new Date().toISOString(),
            ...partial,
          }
          def.rows.push(row)
          results.push(row)
        }
      }
      return { data: results, error: null }
    }

    if (this.pendingInsert) {
      const inserted: Row[] = []
      for (const partial of this.pendingInsert) {
        const conflict = this.findUniqueConflict(def, partial)
        if (conflict) {
          return {
            data: null,
            error: new FakeQueryError(
              `duplicate key value violates unique constraint on ${this.table}`,
              '23505',
            ),
          }
        }
        const row: Row = {
          id: partial.id ?? `${this.table}-${def.rows.length + inserted.length + 1}`,
          created_at: partial.created_at ?? new Date().toISOString(),
          ...partial,
        }
        def.rows.push(row)
        inserted.push(row)
      }
      return { data: inserted, error: null }
    }

    if (this.pendingUpdate) {
      const updated: Row[] = []
      for (const row of def.rows) {
        if (this.matches(row)) {
          Object.assign(row, this.pendingUpdate)
          updated.push(row)
        }
      }
      return { data: updated, error: null }
    }

    if (this.pendingDelete) {
      const toDelete = def.rows.filter((r) => this.matches(r))
      def.rows = def.rows.filter((r) => !this.matches(r))
      return { data: toDelete, error: null }
    }

    const filtered = this.applyOrder(def.rows.filter((r) => this.matches(r)))
    return { data: filtered.map((r) => ({ ...r })), error: null }
  }

  private findUniqueConflict(def: TableDef, candidate: Row): boolean {
    if (!def.uniques) return false
    return def.uniques.some((cols) =>
      def.rows.some((existing) => cols.every((c) => existing[c] === candidate[c])),
    )
  }

  single() {
    return Promise.resolve().then(() => {
      const { data, error } = this.resolveSync()
      if (error) return { data: null, error }
      if (!data || data.length === 0) {
        return { data: null, error: new FakeQueryError('No rows found', 'PGRST116') }
      }
      if (data.length > 1) {
        return { data: null, error: new FakeQueryError('Multiple rows found', 'PGRST117') }
      }
      return { data: data[0], error: null }
    })
  }

  maybeSingle() {
    return Promise.resolve().then(() => {
      const { data, error } = this.resolveSync()
      if (error) return { data: null, error }
      return { data: data && data.length > 0 ? data[0] : null, error: null }
    })
  }

  then<TResult1 = { data: Row[] | null; error: FakeQueryError | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: Row[] | null; error: FakeQueryError | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve()
      .then(() => this.resolveSync())
      .then(onfulfilled, onrejected)
  }
}

interface FakeAuthUser {
  id: string
  email: string
}

class FakeAuth {
  private users = new Map<string, { id: string; email: string; password: string }>()
  currentUser: FakeAuthUser | null = null

  /** Mimics handle_new_user(): whatever runs on a real `auth.users` insert trigger. */
  onSignUp: ((id: string, metadata: Record<string, unknown>) => void) | null = null

  seedUser(id: string, email: string, password: string) {
    this.users.set(email, { id, email, password })
  }

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const record = this.users.get(email)
    if (!record || record.password !== password) {
      return { data: { user: null, session: null }, error: new FakeQueryError('Invalid login credentials') }
    }
    this.currentUser = { id: record.id, email: record.email }
    return {
      data: { user: this.currentUser, session: { access_token: `fake-token-${record.id}` } },
      error: null,
    }
  }

  async signUp({
    email,
    password,
    options,
  }: {
    email: string
    password: string
    options?: { data?: Record<string, unknown> }
  }) {
    if (this.users.has(email)) {
      return { data: { user: null, session: null }, error: new FakeQueryError('User already registered') }
    }
    const id = `auth-${this.users.size + 1}`
    this.users.set(email, { id, email, password })
    this.currentUser = { id, email }
    this.onSignUp?.(id, options?.data ?? {})
    return { data: { user: this.currentUser, session: { access_token: `fake-token-${id}` } }, error: null }
  }

  async signOut() {
    this.currentUser = null
    return { error: null }
  }

  /** Test-only: clears all registered auth accounts and the current session. */
  reset() {
    this.users.clear()
    this.currentUser = null
  }

  async getUser() {
    return { data: { user: this.currentUser }, error: null }
  }

  async getSession() {
    if (!this.currentUser) {
      return { data: { session: null }, error: null }
    }
    return {
      data: { session: { user: this.currentUser, access_token: `fake-token-${this.currentUser.id}` } },
      error: null,
    }
  }

  async updateUser({ password }: { password?: string }) {
    if (!this.currentUser) {
      return { data: { user: null }, error: new FakeQueryError('Not authenticated') }
    }
    const record = this.users.get(this.currentUser.email)
    if (record && password) record.password = password
    return { data: { user: this.currentUser }, error: null }
  }
}

export class FakeSupabaseDatabase {
  private tables = new Map<string, TableDef>()
  auth = new FakeAuth()

  constructor() {
    // Mirrors handle_new_user(): the only path that ever creates a profiles row.
    this.auth.onSignUp = (id, metadata) => {
      if (!this.tables.has('profiles')) return
      const name = (metadata.name as string) ?? 'Unknown'
      this.table('profiles').rows.push({
        id,
        name,
        slug: slugify(name),
        roles: ['member'],
        team: null,
        must_change_password: false,
        created_at: new Date().toISOString(),
      })
    }
  }

  defineTable(name: string, rows: Row[] = [], uniques?: string[][]) {
    this.tables.set(name, { rows: rows.map((r) => ({ ...r })), uniques })
    return this
  }

  table(name: string): TableDef {
    const def = this.tables.get(name)
    if (!def) throw new Error(`FakeSupabaseDatabase: table "${name}" was not defined`)
    return def
  }

  rows(name: string): Row[] {
    return this.table(name).rows
  }

  from(table: string) {
    return new QueryBuilder(this, table)
  }
}

export function createFakeSupabaseClient(db = new FakeSupabaseDatabase()) {
  return {
    db,
    from: (table: string) => db.from(table),
    auth: db.auth,
  }
}

export type FakeSupabaseClient = ReturnType<typeof createFakeSupabaseClient>
