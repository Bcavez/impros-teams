export const ROLES = Object.freeze(['member', 'captain', 'admin', 'doms'] as const)

export type Role = (typeof ROLES)[number]
