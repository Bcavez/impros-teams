export const ROLES = Object.freeze(['member', 'captain', 'admin'] as const)

export type Role = (typeof ROLES)[number]
