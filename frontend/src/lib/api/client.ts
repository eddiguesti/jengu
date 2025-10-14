import axios, { AxiosInstance, AxiosError } from 'axios'

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if exists
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status

      if (status === 401) {
        // Unauthorized - clear auth and redirect to login
        localStorage.removeItem('auth_token')
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
