/**
 * Pure helpers for the doms view (spec-doms.md §6). No I/O.
 */
import { TEAMS, type Team } from '@/lib/teams'

export type AttendanceStatus = 'absent' | 'present' | 'undecided'
export type ShowKind = 'captain' | 'doms'

export interface DomsMember {
  id: string
  name: string
  team: Team | null
}

/** A show of either kind, normalized for the doms table. `key` is unique across both kinds. */
export interface ViewShow {
  key: string
  kind: ShowKind
  id: string
  name: string
  date: string
  teams: Team[]
}

export interface DomsSession {
  id: string
  date: string
  team: Team
  created_at: string
}

export interface TeamGroup {
  team: Team
  members: DomsMember[]
}

/** Members with a team, grouped in TEAMS order and sorted by name inside each team. */
export function groupMembersByTeam(members: DomsMember[]): TeamGroup[] {
  return TEAMS.map((team) => ({
    team,
    members: members.filter((m) => m.team === team).sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((g) => g.members.length > 0)
}

export interface MergedDate {
  date: string
  /** Session id of each team on that date (earliest-created when a team has several). */
  sessionByTeam: Record<Team, string>
}

/** Dates on which ALL teams have a session, ascending. Duplicate sessions: earliest created wins. */
export function mergeCoachingDates(sessions: DomsSession[]): MergedDate[] {
  const byDate = new Map<string, Map<Team, DomsSession>>()
  for (const s of sessions) {
    const teams = byDate.get(s.date) ?? new Map<Team, DomsSession>()
    const current = teams.get(s.team)
    if (
      !current ||
      s.created_at < current.created_at ||
      (s.created_at === current.created_at && s.id < current.id)
    ) {
      teams.set(s.team, s)
    }
    byDate.set(s.date, teams)
  }

  const merged: MergedDate[] = []
  for (const [date, teams] of byDate) {
    if (!TEAMS.every((t) => teams.has(t))) continue
    const sessionByTeam = {} as Record<Team, string>
    for (const t of TEAMS) sessionByTeam[t] = teams.get(t)!.id
    merged.push({ date, sessionByTeam })
  }
  return merged.sort((a, b) => a.date.localeCompare(b.date))
}

export function sortByDateThenName<T extends { date: string; name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))
}

/** Normalizes captain shows (one team) and doms shows (teams from doms_show_teams). */
export function toDomsViewShows(
  captainShows: { id: string; name: string; date: string; team: Team }[],
  domsShows: { id: string; name: string; date: string }[],
  domsTeams: { show_id: string; team: Team }[],
): ViewShow[] {
  const captain = captainShows.map<ViewShow>((s) => ({
    key: `captain|${s.id}`,
    kind: 'captain',
    id: s.id,
    name: s.name,
    date: s.date,
    teams: [s.team],
  }))
  const doms = domsShows.map<ViewShow>((s) => ({
    key: `doms|${s.id}`,
    kind: 'doms',
    id: s.id,
    name: s.name,
    date: s.date,
    teams: TEAMS.filter((t) => domsTeams.some((dt) => dt.show_id === s.id && dt.team === t)),
  }))
  return sortByDateThenName([...captain, ...doms])
}

export interface ShowColumn {
  /** Unique column key: `captain|<date>` for merged team shows, the show key for a doms show. */
  key: string
  date: string
  shows: ViewShow[]
  /** True for a column holding a doms-created show (never merged with anything). */
  hasDoms: boolean
}

/**
 * Columns of the shows table, ascending by date. Captain (team) shows sharing a date are merged
 * into one column; a doms show always keeps its own column, even on the same date.
 */
export function groupShowsByDate(shows: ViewShow[]): ShowColumn[] {
  const captainByDate = new Map<string, ViewShow[]>()
  const columns: ShowColumn[] = []
  for (const s of sortByDateThenName(shows)) {
    if (s.kind === 'doms') {
      columns.push({ key: s.key, date: s.date, shows: [s], hasDoms: true })
    } else {
      captainByDate.set(s.date, [...(captainByDate.get(s.date) ?? []), s])
    }
  }
  for (const [date, list] of captainByDate) {
    columns.push({ key: `captain|${date}`, date, shows: list, hasDoms: false })
  }
  // Same date: merged team column first, then doms columns (stable by name).
  return columns.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      Number(a.hasDoms) - Number(b.hasDoms) ||
      a.shows[0].name.localeCompare(b.shows[0].name),
  )
}

export interface ShowCell {
  showKey: string
  kind: ShowKind
  showId: string
  /** False => render "N/A" (member's current team is not a target of the show). */
  applicable: boolean
  status: AttendanceStatus
  inCast: boolean
}

export interface ShowsMatrixRow {
  member: DomsMember
  cells: ShowCell[]
}

interface AvailabilityRow {
  user_id: string
  show_id: string
  status: AttendanceStatus
}
interface AssignmentRow {
  user_id: string
  show_id: string
}

export function buildDomsShowsMatrix(
  members: DomsMember[],
  shows: ViewShow[],
  availability: { captain: AvailabilityRow[]; doms: AvailabilityRow[] },
  assignments: { captain: AssignmentRow[]; doms: AssignmentRow[] },
): ShowsMatrixRow[] {
  const avail = new Map<string, AttendanceStatus>()
  for (const a of availability.captain) avail.set(`captain|${a.user_id}|${a.show_id}`, a.status)
  for (const a of availability.doms) avail.set(`doms|${a.user_id}|${a.show_id}`, a.status)
  const cast = new Set<string>()
  for (const a of assignments.captain) cast.add(`captain|${a.user_id}|${a.show_id}`)
  for (const a of assignments.doms) cast.add(`doms|${a.user_id}|${a.show_id}`)

  return groupMembersByTeam(members)
    .flatMap((g) => g.members)
    .map((member) => ({
      member,
      cells: shows.map<ShowCell>((show) => {
        const applicable = !!member.team && show.teams.includes(member.team)
        const k = `${show.kind}|${member.id}|${show.id}`
        return {
          showKey: show.key,
          kind: show.kind,
          showId: show.id,
          applicable,
          status: applicable ? (avail.get(k) ?? 'undecided') : 'undecided',
          inCast: applicable && cast.has(k),
        }
      }),
    }))
}

export interface CoachingCell {
  date: string
  status: AttendanceStatus
}

export interface CoachingMatrixRow {
  member: DomsMember
  cells: CoachingCell[]
  summary: { present: number; total: number }
}

function localDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function buildDomsCoachingMatrix(
  members: DomsMember[],
  mergedDates: MergedDate[],
  attendance: { user_id: string; session_id: string; status: AttendanceStatus }[],
  today: Date = new Date(),
): CoachingMatrixRow[] {
  const att = new Map(attendance.map((a) => [`${a.user_id}|${a.session_id}`, a.status]))
  const todayStr = localDateString(today)

  return groupMembersByTeam(members)
    .flatMap((g) => g.members)
    .map((member) => {
      const cells = mergedDates.map<CoachingCell>((md) => ({
        date: md.date,
        status: att.get(`${member.id}|${md.sessionByTeam[member.team as Team]}`) ?? 'present',
      }))
      const upToToday = cells.filter((c) => c.date <= todayStr)
      return {
        member,
        cells,
        summary: {
          present: upToToday.filter((c) => c.status === 'present').length,
          total: upToToday.length,
        },
      }
    })
}
