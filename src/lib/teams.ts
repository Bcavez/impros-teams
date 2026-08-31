export const TEAMS = Object.freeze(['Samurai', 'Gladiator', 'Viking'] as const)

export type Team = (typeof TEAMS)[number]
