import { beforeEach, describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { resetFakeDb, fakeDb, seedAuthUser } from '../helpers/mock-supabase'
import { ADMIN_USER, SAMURAI_CAPTAIN, SAMURAI_MEMBER_1, GLADIATOR_MEMBER, UNASSIGNED_MEMBER } from '../fixtures/users'
import { useUserStore } from '@/stores/user'

beforeEach(() => {
  setActivePinia(createPinia())
  resetFakeDb()
})

describe('login (spec.md §4)', () => {
  it('logs in with the name-derived synthetic email and the real password', async () => {
    seedAuthUser(SAMURAI_MEMBER_1, 'Str0ngPass')
    const store = useUserStore()

    const result = await store.login(SAMURAI_MEMBER_1.name as string, 'Str0ngPass')

    expect(result.success).toBe(true)
    expect(store.user?.id).toBe(SAMURAI_MEMBER_1.id)
    expect(store.isAuthenticated).toBe(true)
  })

  it('rejects an incorrect password', async () => {
    seedAuthUser(SAMURAI_MEMBER_1, 'Str0ngPass')
    const store = useUserStore()

    const result = await store.login(SAMURAI_MEMBER_1.name as string, 'wrong-password')

    expect(result.success).toBe(false)
    expect(store.isAuthenticated).toBe(false)
  })
})

describe('registration password policy (spec.md §4.2, improvements.md #11)', () => {
  it('rejects a registration whose password fails the password policy', async () => {
    const store = useUserStore()

    const result = await store.register('New Person', 'a')

    expect(result.success).toBe(false)
  })

  it('creates a profile via the signup trigger when the password is valid', async () => {
    const store = useUserStore()

    const result = await store.register('New Person', 'Str0ngPass')

    expect(result.success).toBe(true)
    expect(store.user?.name).toBe('New Person')
    expect(store.user?.roles).toEqual(['member'])
  })
})

describe('no self-service profile write (spec.md §7.1)', () => {
  it('exposes no updateProfile action at all', () => {
    const store = useUserStore()
    expect((store as unknown as { updateProfile?: unknown }).updateProfile).toBeUndefined()
  })
})

describe('team assignment is admin-only (spec.md §3, improvements.md #6/#8)', () => {
  it('a captain cannot move a member from another team into their own team', async () => {
    const store = useUserStore()
    // @ts-expect-error test setup
    store.user = { ...SAMURAI_CAPTAIN }

    const result = await store.assignTeam(GLADIATOR_MEMBER.id as string, 'Samurai')

    expect(result.success).toBe(false)
    const stillGladiator = fakeDb.rows('profiles').find((u) => u.id === GLADIATOR_MEMBER.id)
    expect(stillGladiator?.team).toBe('Gladiator')
  })

  it('a captain cannot assign even an unassigned member to their own team', async () => {
    const store = useUserStore()
    // @ts-expect-error test setup
    store.user = { ...SAMURAI_CAPTAIN }

    const result = await store.assignTeam(UNASSIGNED_MEMBER.id as string, 'Samurai')

    expect(result.success).toBe(false)
  })

  it('an admin can assign any user to any team', async () => {
    const store = useUserStore()
    // @ts-expect-error test setup
    store.user = { ...ADMIN_USER }

    const result = await store.assignTeam(UNASSIGNED_MEMBER.id as string, 'Samurai')

    expect(result.success).toBe(true)
  })
})

describe('role changes never expose admin as an assignable option (spec.md §10.4)', () => {
  it('setUserRole preserves an existing admin role when granting captain', async () => {
    const adminWithTeam = { ...ADMIN_USER, team: 'Samurai' }
    fakeDb.rows('profiles').splice(
      fakeDb.rows('profiles').findIndex((u) => u.id === ADMIN_USER.id),
      1,
      adminWithTeam,
    )
    const store = useUserStore()
    // @ts-expect-error test setup
    store.user = { ...adminWithTeam }
    store.allUsers = [{ ...adminWithTeam } as never]

    const result = await store.setUserRole(ADMIN_USER.id as string, 'captain')

    expect(result.success).toBe(true)
    const updated = fakeDb.rows('profiles').find((u) => u.id === ADMIN_USER.id)
    expect(updated?.roles).toEqual(expect.arrayContaining(['admin', 'captain']))
  })

  it('blocks granting captain to a member with no team', async () => {
    const store = useUserStore()
    // @ts-expect-error test setup
    store.user = { ...ADMIN_USER }
    store.allUsers = [{ ...UNASSIGNED_MEMBER } as never]

    const result = await store.setUserRole(UNASSIGNED_MEMBER.id as string, 'captain')

    expect(result.success).toBe(false)
  })

  it('a non-admin cannot change roles', async () => {
    const store = useUserStore()
    // @ts-expect-error test setup
    store.user = { ...SAMURAI_CAPTAIN }

    const result = await store.setUserRole(SAMURAI_MEMBER_1.id as string, 'captain')

    expect(result.success).toBe(false)
  })
})

describe('admin-only user management (already correct today — regression guard)', () => {
  it('a non-admin cannot list all users', async () => {
    const store = useUserStore()
    // @ts-expect-error test setup
    store.user = { ...SAMURAI_CAPTAIN }

    const result = await store.getAllUsers()

    expect(result.success).toBe(false)
  })

  it('an admin can list all users', async () => {
    const store = useUserStore()
    // @ts-expect-error test setup
    store.user = { ...ADMIN_USER }

    const result = await store.getAllUsers()

    expect(result.success).toBe(true)
    expect(result.users.length).toBe(fakeDb.rows('profiles').length)
  })

  it('exposes no deleteUser action — account deletion is dashboard-only (spec.md §9)', () => {
    const store = useUserStore()
    expect((store as unknown as { deleteUser?: unknown }).deleteUser).toBeUndefined()
  })
})

describe.todo(
  'server-side enforcement of the rules above via RLS (spec.md §7) — requires a real Postgres ' +
    'instance to exercise policies; not verifiable against the in-memory fake client used here',
)
