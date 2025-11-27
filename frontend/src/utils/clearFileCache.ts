/**
 * Utility to completely clear all file-related cache
 * Use this when files keep reappearing after deletion
 */

import { useDataStore } from '../stores/useDataStore'
import { QueryClient } from '@tanstack/react-query'

/**
 * Nuclear option: Clear ALL file-related data from everywhere
 * - React Query cache
 * - Zustand localStorage
 * - Browser localStorage (jengu-data-storage)
 */
export function clearAllFileCache(queryClient: QueryClient) {
  console.log('🧹 Clearing ALL file cache...')

  // 1. Clear React Query cache for ALL file queries
  queryClient.clear()
  console.log('✅ Cleared React Query cache')

  // 2. Clear Zustand store
  const { clearFiles } = useDataStore.getState()
  clearFiles()
  console.log('✅ Cleared Zustand file store')

  // 3. Force clear localStorage (in case Zustand persist didn't update)
  try {
    localStorage.removeItem('jengu-data-storage')
    console.log('✅ Cleared localStorage jengu-data-storage')
  } catch (error) {
    console.warn('⚠️ Could not clear localStorage:', error)
  }

  console.log('🎉 File cache completely cleared!')
}

/**
 * Expose as window function for debugging
 */
if (typeof window !== 'undefined') {
  ;(window as any).clearFileCache = clearAllFileCache
}
