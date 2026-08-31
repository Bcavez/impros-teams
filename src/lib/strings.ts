/**
 * Partial centralization of user-facing French strings (spec.md §11, improvements.md #17):
 * status labels, generic validation/error messages, empty states, and confirm dialogs used
 * across more than one component. Strings that only ever appear once, inline in a single
 * template, are left there rather than indirected through here.
 */

export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  present: 'Présent',
  absent: 'Absent',
  undecided: 'Indécis',
}

export const NAV_LABELS = {
  dashboard: 'Tableau de bord',
  admin: 'Admin',
  captain: 'Capitaine',
  account: 'Mon compte',
  logout: 'Déconnexion',
  refresh: 'Actualiser',
  refreshing: 'Actualisation...',
}

export const VALIDATION_MESSAGES = {
  passwordsDoNotMatch: 'Les mots de passe ne correspondent pas',
  noUserLoggedIn: 'Aucun utilisateur connecté',
}

export const EMPTY_STATES = {
  noTeam: "Vous n'êtes pas encore assigné(e) à une équipe. Contactez un administrateur.",
  noCoachingSessions: 'Aucune séance de coaching prévue pour le moment.',
  noShows: 'Aucun spectacle prévu pour le moment.',
}

export const CONFIRM_MESSAGES = {
  deleteCoachingSession: 'Êtes-vous sûr de vouloir supprimer cette séance de coaching ?',
  deleteShow: 'Êtes-vous sûr de vouloir supprimer ce spectacle ?',
  removeMemberFromShow: 'Retirer ce membre du spectacle ?',
}
