import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useUser } from '@/hooks/useUser'
import api from '@/utils/api'
import axios from 'axios'
import { authenticateWithJellyfin } from '@/lib/jellyfin/auth'

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

      try {
        await authenticateWithJellyfin(username, password)
      } catch {
        setError('Logged into Jellyseerr, but could not connect to Jellyfin for playback.')
        setLoading(false)
        return
      }

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
      <div className="flex h-screen items-center justify-center bg-dark">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  if (user) return null

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white">Jellysea</h1>
          <p className="mt-2 text-slate-400">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="mt-1 block w-full rounded-md border border-dark-500 bg-dark-800 px-3 py-2 text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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
              className="mt-1 block w-full rounded-md border border-dark-500 bg-dark-800 px-3 py-2 text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-900/50 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-md bg-gradient-to-br from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-dark disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}