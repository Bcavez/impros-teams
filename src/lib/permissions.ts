/**
 * Pure authorization predicates (spec.md §2, §7). No I/O. Stores and RLS policies both defer
 * to the same rules described here rather than re-implementing them independently.
 */

export interface PermissionUser {
  id: string
  roles: string[]
  team: string | null
}

export interface TeamScoped {
  team: string
}

export interface DatedEvent {
  date: string
}

export function isAdmin(user: PermissionUser): boolean {
  return user.roles.includes('admin')
}

/** Does NOT treat admin as an implicit captain — see spec.md §2. */
export function isCaptain(user: PermissionUser): boolean {
  return user.roles.includes('captain')
}

export function isCaptainOfTeam(user: PermissionUser, team: string): boolean {
  return isCaptain(user) && user.team === team
}

export function canEditCoachingSession(user: PermissionUser, session: TeamScoped): boolean {
  return isCaptainOfTeam(user, session.team)
}

export function canEditShow(user: PermissionUser, show: TeamScoped): boolean {
  return isCaptainOfTeam(user, show.team)
}

export function canSetAttendanceFor(
  actor: PermissionUser,
  targetUserId: string,
  event: TeamScoped,
): boolean {
  if (actor.id === targetUserId) return true
  return isCaptainOfTeam(actor, event.team)
}

/**
 * Parses a `YYYY-MM-DD` date-only string as LOCAL midnight (never UTC), so comparisons are
 * never off by one calendar day depending on the caller's timezone. `today` defaults to `now`
 * but accepts an override for deterministic tests.
 */
export function isPastDate(date: string, today: Date = new Date()): boolean {
  const [year, month, day] = date.split('-').map(Number)
  const target = new Date(year, month - 1, day)
  target.setHours(0, 0, 0, 0)

  const todayMidnight = new Date(today)
  todayMidnight.setHours(0, 0, 0, 0)

  return target.getTime() < todayMidnight.getTime()
}

/**
 * Members cannot edit anything dated before today; captains can, so they can record what
 * actually happened after the fact (spec.md §7.2). Deliberately takes only the authenticated
 * user object — never an optional caller-supplied role — so it cannot be bypassed by omitting
 * an argument.
 */
export function canEditPastEvent(user: PermissionUser, event: DatedEvent): boolean {
  if (!isPastDate(event.date)) return true
  return isCaptain(user)
}
