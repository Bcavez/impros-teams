/**
 * Maps a display name to a synthetic Supabase Auth identity (spec.md §4). Login stays
 * name-only in the UI while every account has a real (but fake) auth email under the hood.
 * `slugify` must be byte-identical between registration and login — it also backs the
 * `profiles.slug` generated column's uniqueness constraint, so two names that slugify
 * identically (e.g. "Jean-Luc" and "Jean Luc") are treated as a collision by design.
 */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function syntheticEmail(name: string): string {
  return `${slugify(name)}@impros.local`
}
