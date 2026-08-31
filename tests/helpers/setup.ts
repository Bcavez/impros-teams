import { beforeEach } from 'vitest'
import { queryClient } from '@/lib/query-client'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  // The query cache is a module-level singleton (by design — see src/lib/query-client.ts), so
  // it must be cleared between tests or a later test could read cached data seeded by an
  // earlier one instead of the fresh fixtures `resetFakeDb` just installed.
  queryClient.clear()
})
