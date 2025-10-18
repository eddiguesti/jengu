/**
 * Authentication Context
 *
 * Provides authentication state and methods throughout the app
 * Includes automatic token refresh and session timeout handling
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import {
  supabase,
  signIn as supabaseSignIn,
  signUp as supabaseSignUp,
  signOut as supabaseSignOut,
  getSession,
} from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, name?: string) => Promise<any>
  signOut: () => Promise<void>
  isAuthenticated: boolean
  lastActivity: number | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Session timeout: 30 minutes of inactivity
const SESSION_TIMEOUT_MS = 30 * 60 * 1000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastActivity, setLastActivity] = useState<number | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Update activity timestamp
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now())
  }, [])

  // Check for session timeout
  const checkTimeout = useCallback(async () => {
    if (!lastActivity || !user) return

    const now = Date.now()
    const timeSinceActivity = now - lastActivity

    if (timeSinceActivity > SESSION_TIMEOUT_MS) {
      console.warn('Session timeout - signing out user')
      await supabaseSignOut()
      setUser(null)
      setSession(null)
      setLastActivity(null)
    }
  }, [lastActivity, user])

  useEffect(() => {
    // Get initial session
    getSession().then(session => {
      setSession(session)
      setUser(session?.user || null)
      setLoading(false)
      // Initialize activity timestamp
      setLastActivity(Date.now())
    })

    // Listen for auth changes (includes automatic token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      console.log('Auth state changed:', event, session?.user?.email)

      // Handle token refresh
      if (event === 'TOKEN_REFRESHED') {
        console.log('Session token refreshed successfully')
      }

      // Handle signed out
      if (event === 'SIGNED_OUT') {
        setLastActivity(null)
      }

      setSession(session)
      setUser(session?.user || null)
      setLoading(false)

      // Update activity on auth changes
      if (session) {
        updateActivity()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [updateActivity])

  // Set up activity listeners and timeout checker
  useEffect(() => {
    if (!user) return

    // Update activity on user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      window.addEventListener(event, updateActivity)
    })

    // Check for timeout every minute
    timeoutRef.current = setInterval(checkTimeout, 60 * 1000)

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity)
      })
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current)
      }
    }
  }, [user, updateActivity, checkTimeout])

  const signIn = async (email: string, password: string) => {
    try {
      const data = await supabaseSignIn(email, password)
      setUser(data.user)
      setSession(data.session)
      return data
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in')
    }
  }

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const data = await supabaseSignUp(email, password, name)
      setUser(data.user)
      setSession(data.session)
      return data
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign up')
    }
  }

  const signOut = async () => {
    try {
      await supabaseSignOut()
      setUser(null)
      setSession(null)
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign out')
    }
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    lastActivity,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

export default AuthContext
