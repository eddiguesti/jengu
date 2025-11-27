/**
 * Unified Authentication Page
 *
 * Beautiful, modern login/signup with smooth transitions
 * Matches app design system with neon yellow (#EBFF57) accents
 */

import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { signInWithGoogle, resetPasswordForEmail, updatePassword } from '../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Mail, Lock, User, CheckCircle2, Eye, EyeOff, ArrowLeft } from 'lucide-react'

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password'

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Check if user arrived via password reset link
  useEffect(() => {
    if (searchParams.get('reset') === 'true') {
      setMode('reset-password')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        await signIn(email, password)
        setSuccess(true)
        setSuccessMessage('Welcome to Jengu!')
        setTimeout(() => {
          navigate('/')
        }, 1200)
      } else if (mode === 'signup') {
        const result = await signUp(email, password, name)

        // Check if email confirmation is required
        if (result.user && !result.session) {
          setError('Please check your email to confirm your account before logging in.')
          setLoading(false)
          return
        }
        setSuccess(true)
        setSuccessMessage('Welcome to Jengu!')
        setTimeout(() => {
          navigate('/')
        }, 1200)
      } else if (mode === 'forgot-password') {
        await resetPasswordForEmail(email)
        setSuccess(true)
        setSuccessMessage('Check your email for a password reset link!')
        setLoading(false)
      } else if (mode === 'reset-password') {
        // Validate passwords match
        if (newPassword !== confirmPassword) {
          setError('Passwords do not match')
          setLoading(false)
          return
        }
        if (newPassword.length < 6) {
          setError('Password must be at least 6 characters')
          setLoading(false)
          return
        }
        await updatePassword(newPassword)
        setSuccess(true)
        setSuccessMessage('Password updated successfully!')
        setTimeout(() => {
          setMode('login')
          setSuccess(false)
          setNewPassword('')
          setConfirmPassword('')
        }, 2000)
        setLoading(false)
      }
    } catch (err: any) {
      // Provide helpful error messages
      let errorMessage = err.message

      if (errorMessage.includes('Invalid login credentials')) {
        errorMessage =
          'Invalid email or password. Please check your credentials or sign up for a new account.'
      } else if (errorMessage.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the confirmation link before logging in.'
      }

      setError(errorMessage || `Failed to ${mode === 'login' ? 'sign in' : 'sign up'}`)
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login')
    setError('')
    setEmail('')
    setPassword('')
    setName('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const goToForgotPassword = () => {
    setMode('forgot-password')
    setError('')
    setPassword('')
  }

  const backToLogin = () => {
    setMode('login')
    setError('')
    setSuccess(false)
  }

  const handleGoogleSignIn = async () => {
    try {
      setError('')
      setLoading(true)
      await signInWithGoogle()
      // User will be redirected to Google, then back to app
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google')
      setLoading(false)
    }
  }

  // Success overlay animation
  if (success && (mode === 'login' || mode === 'signup')) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="bg-primary/20 mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full"
          >
            <CheckCircle2 className="text-primary h-10 w-10" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-text text-2xl font-bold"
          >
            {successMessage || 'Welcome to Jengu!'}
          </motion.h2>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="bg-background relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      {/* Animated background gradient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.03, 0.05, 0.03],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="bg-primary absolute left-1/4 top-1/4 h-96 w-96 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.02, 0.04, 0.02],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
          className="bg-primary absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full blur-[120px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="border-border bg-card shadow-elevated overflow-hidden rounded-2xl border">
          {/* Header with logo and title */}
          <div className="border-border bg-elevated/50 border-b p-8 pb-6 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="border-primary/20 bg-primary/10 mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl border"
            >
              <Sparkles className="text-primary h-8 w-8" />
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-text mb-2 text-3xl font-bold">
                  {mode === 'login' && 'Welcome Back'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'forgot-password' && 'Reset Password'}
                  {mode === 'reset-password' && 'Set New Password'}
                </h1>
                <p className="text-muted text-sm">
                  {mode === 'login' && 'Sign in to continue to Jengu'}
                  {mode === 'signup' && 'Join Jengu to start optimizing your pricing'}
                  {mode === 'forgot-password' && "Enter your email and we'll send you a reset link"}
                  {mode === 'reset-password' && 'Choose a new password for your account'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mx-8 mt-6"
              >
                <div className="border-error/30 bg-error/10 rounded-xl border p-4">
                  <p className="text-error text-sm">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success message for forgot password */}
          <AnimatePresence>
            {success && (mode === 'forgot-password' || mode === 'reset-password') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mx-8 mt-6"
              >
                <div className="border-success/30 bg-success/10 rounded-xl border p-4 text-center">
                  <CheckCircle2 className="text-success mx-auto mb-2 h-8 w-8" />
                  <p className="text-success text-sm font-medium">{successMessage}</p>
                  {mode === 'forgot-password' && (
                    <button
                      onClick={backToLogin}
                      className="text-primary hover:text-primary/80 mt-3 text-sm font-medium"
                    >
                      Back to login
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google Sign-In Button - only show for login/signup */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="p-8 pb-0">
              <motion.button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="border-border hover:border-primary/30 hover:bg-elevated group flex w-full items-center justify-center gap-3 rounded-xl border-2 bg-white px-4 py-3.5 font-semibold text-gray-700 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="relative z-10">Continue with Google</span>
              </motion.button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="border-border w-full border-t"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-card text-muted px-4">Or continue with email</span>
                </div>
              </div>
            </div>
          )}

          {/* Back to login for forgot/reset password */}
          {(mode === 'forgot-password' || mode === 'reset-password') && !success && (
            <div className="px-8 pt-6">
              <button
                onClick={backToLogin}
                className="text-muted hover:text-text flex items-center gap-2 text-sm transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </button>
            </div>
          )}

          {/* Form */}
          {!(success && (mode === 'forgot-password' || mode === 'reset-password')) && (
            <form onSubmit={handleSubmit} className="space-y-5 px-8 pb-8 pt-2">
              <AnimatePresence mode="wait">
                {mode === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <label htmlFor="name" className="text-text mb-2 block text-sm font-medium">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="text-muted pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required={mode === 'signup'}
                        className="border-border bg-elevated text-text placeholder-muted focus:border-primary focus:ring-primary/50 w-full rounded-xl border py-3.5 pl-12 pr-4 transition-all focus:outline-none focus:ring-2"
                        placeholder="Enter your name"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email field - show for login, signup, forgot-password */}
              {mode !== 'reset-password' && (
                <div>
                  <label htmlFor="email" className="text-text mb-2 block text-sm font-medium">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="text-muted pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="border-border bg-elevated text-text placeholder-muted focus:border-primary focus:ring-primary/50 w-full rounded-xl border py-3.5 pl-12 pr-4 transition-all focus:outline-none focus:ring-2"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
              )}

              {/* Password field - show for login and signup only */}
              {(mode === 'login' || mode === 'signup') && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label htmlFor="password" className="text-text text-sm font-medium">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={goToForgotPassword}
                        className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="text-muted pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className="border-border bg-elevated text-text placeholder-muted focus:border-primary focus:ring-primary/50 w-full rounded-xl border py-3.5 pl-12 pr-12 transition-all focus:outline-none focus:ring-2"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted hover:text-text absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* New password fields - show for reset-password only */}
              {mode === 'reset-password' && (
                <>
                  <div>
                    <label htmlFor="newPassword" className="text-text mb-2 block text-sm font-medium">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="text-muted pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
                      <input
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className="border-border bg-elevated text-text placeholder-muted focus:border-primary focus:ring-primary/50 w-full rounded-xl border py-3.5 pl-12 pr-12 transition-all focus:outline-none focus:ring-2"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-muted hover:text-text absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="text-text mb-2 block text-sm font-medium">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="text-muted pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
                      <input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className="border-border bg-elevated text-text placeholder-muted focus:border-primary focus:ring-primary/50 w-full rounded-xl border py-3.5 pl-12 pr-4 transition-all focus:outline-none focus:ring-2"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                </>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="bg-primary text-background hover:shadow-primary/20 group relative w-full overflow-hidden rounded-xl px-4 py-3.5 font-semibold shadow-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="-ml-1 mr-3 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    {mode === 'login' && 'Signing in...'}
                    {mode === 'signup' && 'Creating account...'}
                    {mode === 'forgot-password' && 'Sending reset link...'}
                    {mode === 'reset-password' && 'Updating password...'}
                  </span>
                ) : (
                  <>
                    <span className="relative z-10">
                      {mode === 'login' && 'Sign In'}
                      {mode === 'signup' && 'Create Account'}
                      {mode === 'forgot-password' && 'Send Reset Link'}
                      {mode === 'reset-password' && 'Update Password'}
                    </span>
                    <motion.div
                      className="from-primary/80 to-primary absolute inset-0 bg-gradient-to-r"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  </>
                )}
              </motion.button>
            </form>
          )}

          {/* Toggle mode - only show for login/signup */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="px-8 pb-8 text-center">
              <p className="text-muted text-sm">
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  onClick={toggleMode}
                  className="text-primary hover:text-primary/80 group inline-flex items-center gap-1 font-medium transition-colors"
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-muted mt-8 text-center text-xs"
        >
          <p>Jengu Dynamic Pricing Platform</p>
          <p className="mt-1">© 2025 All rights reserved</p>
        </motion.div>
      </motion.div>
    </div>
  )
}
