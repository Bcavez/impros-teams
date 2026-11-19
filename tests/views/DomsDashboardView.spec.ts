import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { resetFakeDb, fakeDb } from '../helpers/mock-supabase'
import DomsDashboardView from '@/views/DomsDashboardView.vue'
import { useUserStore } from '@/stores/user'
import { queryClient } from '@/lib/query-client'
import { ALL_USERS, SAMURAI_MEMBER_1, GLADIATOR_MEMBER } from '../fixtures/users'
import { DOMS_USER, DOMS_SHOW, DOMS_SHOW_TEAMS } from '../fixtures/doms'
import { FUTURE_SHOW_DATE } from '../fixtures/shows'
import { FUTURE_DATE, PAST_DATE } from '../fixtures/coaching'

const session = (id: string, date: string, team: string) => ({
  id,
  date,
  team,
  coach: 'Coach',
  created_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
})

function seed() {
  resetFakeDb({
    profiles: [...ALL_USERS, DOMS_USER],
    shows: [FUTURE_SHOW_DATE],
    show_assignments: [],
    show_availability: [],
    doms_shows: [DOMS_SHOW],
    doms_show_teams: DOMS_SHOW_TEAMS,
    doms_show_availability: [
      { id: 'da-1', user_id: SAMURAI_MEMBER_1.id, show_id: DOMS_SHOW.id, status: 'present' },
    ],
    // FUTURE_DATE: all three teams. PAST_DATE: only Samurai => dropped from the merged table.
    coaching_sessions: [
      session('f-s', FUTURE_DATE, 'Samurai'),
      session('f-g', FUTURE_DATE, 'Gladiator'),
      session('f-v', FUTURE_DATE, 'Viking'),
      session('p-s', PAST_DATE, 'Samurai'),
    ],
    attendance_records: [],
  })
}

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/doms', component: DomsDashboardView }, { path: '/login', component: { template: '<div />' } }],
  })
  await router.push('/doms')
  await router.isReady()
  const wrapper = mount(DomsDashboardView, { global: { plugins: [router], stubs: { MainNavigation: true } } })
  await flushPromises()
  await flushPromises()
  return wrapper
}

const columnCellSelector = (memberId: string, columnKey: string) =>
  `[data-test="column-cell-${memberId}-${columnKey}"]`
const cellSelector = (memberId: string, showKey: string) => `[data-test="cell-${memberId}-${showKey}"]`

beforeEach(() => {
  setActivePinia(createPinia())
  queryClient.clear()
  seed()
  fakeDb.auth.currentUser = { id: DOMS_USER.id as string, email: 'dora@impros.local' }
  const userStore = useUserStore()
  // @ts-expect-error test setup
  userStore.isAuthenticated = true
  // @ts-expect-error test setup
  userStore.user = { ...DOMS_USER }
})

describe('shows table', () => {
  it('lists captain and doms shows against every member with a team, with N/A for non-target teams', async () => {
    const wrapper = await mountView()

    expect(wrapper.find('[data-test="show-header-captain|show-future"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="show-header-doms|doms-show-1"]').exists()).toBe(true)
    // Gladiator member: not on the Samurai captain show (no chip), but on the doms show
    expect(wrapper.find(cellSelector(GLADIATOR_MEMBER.id as string, 'captain|show-future')).exists()).toBe(false)
    expect(wrapper.find(cellSelector(GLADIATOR_MEMBER.id as string, 'doms|doms-show-1')).exists()).toBe(true)
    expect(wrapper.find(columnCellSelector(GLADIATOR_MEMBER.id as string, 'doms|doms-show-1')).text()).not.toBe('N/A')
    // team-less users and the doms are not rows
    expect(wrapper.text()).not.toContain('Uma Unassigned')
    expect(wrapper.text()).not.toContain('Dora Doms')
  })

  it('keeps a doms show in its own column (never merged) and shows N/A where no show applies', async () => {
    const otherDate = '2099-01-01'
    resetFakeDb({
      profiles: [...ALL_USERS, DOMS_USER],
      shows: [FUTURE_SHOW_DATE],
      doms_shows: [DOMS_SHOW, { ...DOMS_SHOW, id: 'doms-samurai-only', name: 'Solo', date: otherDate }],
      doms_show_teams: [...DOMS_SHOW_TEAMS, { show_id: 'doms-samurai-only', team: 'Samurai' }],
    })
    const wrapper = await mountView()

    // captain show + doms show on FUTURE_DATE do NOT share a column: doms shows are never merged
    expect(wrapper.findAll('[data-test="shows-table"] thead th')).toHaveLength(1 + 3)
    const captainColumn = wrapper.find(`[data-test="show-column-captain|${FUTURE_DATE}"]`)
    const domsColumn = wrapper.find('[data-test="show-column-doms|doms-show-1"]')
    expect(captainColumn.find('[data-test="show-header-captain|show-future"]').exists()).toBe(true)
    expect(captainColumn.find('[data-test="show-header-doms|doms-show-1"]').exists()).toBe(false)
    expect(domsColumn.find('[data-test="show-header-doms|doms-show-1"]').exists()).toBe(true)
    // Gladiator member is not targeted by the Samurai-only show on the other date
    expect(wrapper.find(columnCellSelector(GLADIATOR_MEMBER.id as string, 'doms|doms-samurai-only')).text()).toBe('N/A')
  })

  it('captain show cells are not clickable and never write', async () => {
    const wrapper = await mountView()
    const cell = wrapper.find(cellSelector(SAMURAI_MEMBER_1.id as string, 'captain|show-future'))

    expect(cell.classes()).not.toContain('clickable')
    await cell.trigger('click')
    await flushPromises()
    expect(fakeDb.rows('show_availability')).toHaveLength(0)
  })

  it('clicking a doms show cell cycles availability (present -> undecided)', async () => {
    const wrapper = await mountView()
    const selector = cellSelector(SAMURAI_MEMBER_1.id as string, 'doms|doms-show-1')

    expect(wrapper.find(selector).classes()).toContain('clickable')
    await wrapper.find(selector).trigger('click')
    await flushPromises()
    await flushPromises()

    const row = fakeDb
      .rows('doms_show_availability')
      .find((r) => r.user_id === SAMURAI_MEMBER_1.id && r.show_id === DOMS_SHOW.id)
    expect(row?.status).toBe('undecided')
  })

  it('only doms show columns have header actions', async () => {
    const wrapper = await mountView()
    expect(wrapper.find('[data-test="show-header-doms|doms-show-1"] [data-test="edit-show"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="show-header-captain|show-future"] [data-test="edit-show"]').exists()).toBe(false)
  })

  it('hides past shows until "Voir tout" is toggled', async () => {
    const pastDoms = { ...DOMS_SHOW, id: 'doms-past', name: 'Old Gala', date: PAST_DATE }
    resetFakeDb({
      profiles: [...ALL_USERS, DOMS_USER],
      shows: [],
      doms_shows: [DOMS_SHOW, pastDoms],
      doms_show_teams: [...DOMS_SHOW_TEAMS, { show_id: 'doms-past', team: 'Samurai' }],
    })
    const wrapper = await mountView()

    expect(wrapper.find('[data-test="show-header-doms|doms-past"]').exists()).toBe(false)
    await wrapper.find('[data-test="toggle-shows"]').trigger('click')
    expect(wrapper.find('[data-test="show-header-doms|doms-past"]').exists()).toBe(true)
  })
})

describe('create modal', () => {
  it('requires at least one target team', async () => {
    const wrapper = await mountView()
    await wrapper.find('[data-test="create-show"]').trigger('click')
    await wrapper.find('#doms-show-name').setValue('Nouveau')
    await wrapper.find('#doms-show-date').setValue(FUTURE_DATE)
    await wrapper.find('[data-test="submit-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-test="form-error"]').exists()).toBe(true)
    expect(fakeDb.rows('doms_shows')).toHaveLength(1)
  })

  it('creates a show for the selected teams', async () => {
    const wrapper = await mountView()
    await wrapper.find('[data-test="create-show"]').trigger('click')
    await wrapper.find('#doms-show-name').setValue('Nouveau')
    await wrapper.find('#doms-show-date').setValue(FUTURE_DATE)
    await wrapper.find('[data-test="team-Viking"]').setValue(true)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(fakeDb.rows('doms_shows')).toHaveLength(2)
    expect(fakeDb.rows('doms_show_teams').some((t) => t.team === 'Viking')).toBe(true)
  })

  it('asks for confirmation before removing a team from a show', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = await mountView()
    await wrapper.find('[data-test="show-header-doms|doms-show-1"] [data-test="edit-show"]').trigger('click')
    await wrapper.find('[data-test="team-Gladiator"]').setValue(false)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(confirmSpy).toHaveBeenCalled()
    expect(fakeDb.rows('doms_show_teams').filter((t) => t.show_id === DOMS_SHOW.id)).toHaveLength(2)
  })
})

describe('coaching table', () => {
  it('only has columns for dates where all three teams have a session', async () => {
    const wrapper = await mountView()
    await wrapper.find('[data-test="toggle-coaching"]').trigger('click') // reveal past dates too

    const headers = wrapper.findAll('[data-test="coaching-table"] thead th')
    expect(headers).toHaveLength(2) // member column + the single merged date (FUTURE_DATE)
    expect(headers[1].text()).toContain('2999')
  })

  it('is read-only (no clickable cells)', async () => {
    const wrapper = await mountView()
    expect(wrapper.findAll('[data-test="coaching-table"] .clickable')).toHaveLength(0)
  })
})
