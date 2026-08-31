import { QueryClient } from '@tanstack/vue-query'

/**
 * A single shared QueryClient, passed explicitly to every `useQuery`/`fetchQuery` call rather
 * than relying on Vue's injection context. This lets Pinia store actions (which run outside a
 * component's setup) and Vitest (which never installs VueQueryPlugin on an app) both use the
 * exact same cache as components do — with no separate mocking story per environment.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
})
