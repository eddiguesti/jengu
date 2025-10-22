import axios, { AxiosInstance, AxiosError } from 'axios'
import { supabase } from '../supabase'

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 360000, // 6 minutes (for long-running operations like enrichment with large datasets)
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  async config => {
    // Get Supabase session token
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }

    return config
  },
  error => {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)))
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status

      if (status === 401) {
        // Unauthorized - sign out from Supabase and redirect to login
        await supabase.auth.signOut()
        window.location.href = '/login'
      } else if (status === 500) {
        console.error('Server error:', error.response.data)
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('Network error:', error.message)
    }

    return Promise.reject(error)
  }
)

export default apiClient
