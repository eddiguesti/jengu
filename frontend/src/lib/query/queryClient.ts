/**
 * React Query Configuration
 * Central query client for server-state management
 */

import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache configuration
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection (was cacheTime in v4)

      // Retry configuration
      retry: 1, // Retry failed requests once
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch configuration
      refetchOnWindowFocus: false, // Don't refetch on window focus (can be noisy)
      refetchOnReconnect: true, // Refetch on reconnect

      // Error handling
      throwOnError: false, // Don't throw errors to error boundaries by default
    },
    mutations: {
      // Retry configuration for mutations
      retry: 0, // Don't retry mutations by default
      throwOnError: false,
    },
  },
})
