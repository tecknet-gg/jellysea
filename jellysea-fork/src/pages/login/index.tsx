import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useUser } from '@app/hooks/useUser'
import api from '@app/utils/api'
import axios from 'axios'

export default function LoginPage() {
  const { user, loading: userLoading, revalidate } = useUser()
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userLoading && user) {
      router.push('/')
    }
  }, [user, userLoading, router])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/auth/jellyfin', { username, password })
      await revalidate()
      router.push('/')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response) {
          setError('Invalid credentials. Please try again.')
        } else if (err.request) {
          setError('Unable to reach server. Check your connection.')
        } else {
          setError('Login failed. Please try again.')
        }
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (userLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-midnight-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-accent-500 border-t-transparent" />
      </div>
    )
  }

  if (user) return null

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-midnight-950 px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-accent-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent-400/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="glass-card mb-8 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 shadow-lg shadow-accent-500/20">
            <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Jellysea</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card space-y-5 p-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-300">
              Jellyfin Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field mt-1"
              placeholder="username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field mt-1"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent" />
            ) : null}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
