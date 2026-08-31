import { describe, expect, it } from 'vitest'

// spec.md §4.2, §12 — relocated from src/lib/password-utils.ts (where it exists today but is
// dead code: imported at src/stores/user.ts:5 and never called). Red until the module is moved
// and actually wired into registration.
import { validatePassword } from '@/lib/password-policy'

describe('validatePassword (spec.md §4.2)', () => {
  it('accepts a password meeting every rule', () => {
    expect(validatePassword('Str0ngPass').isValid).toBe(true)
  })

  it('rejects a password shorter than 8 characters', () => {
    const result = validatePassword('Str0ng')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password must be at least 8 characters long')
  })

  it('rejects a password with no uppercase letter', () => {
    const result = validatePassword('str0ngpass')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one uppercase letter')
  })

  it('rejects a password with no lowercase letter', () => {
    const result = validatePassword('STR0NGPASS')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one lowercase letter')
  })

  it('rejects a password with no digit', () => {
    const result = validatePassword('StrongPass')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one number')
  })

  it('rejects the single-character password that the current registration form accepts today', () => {
    // Regression guard for the current bug: validatePassword exists but is never called
    // (src/stores/user.ts:5 imports it, nothing invokes it), so register('a') succeeds today.
    expect(validatePassword('a').isValid).toBe(false)
  })

  it('reports every violated rule at once, not just the first', () => {
    const result = validatePassword('a')
    expect(result.errors.length).toBeGreaterThan(1)
  })
})
