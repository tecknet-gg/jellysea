import jellyfinApi from './client'
import type { AuthenticationResult } from './types'

export async function authenticateWithJellyfin(
  username: string,
  password: string
): Promise<AuthenticationResult> {
  const res = await jellyfinApi.post<AuthenticationResult>('/Users/AuthenticateByName', {
    Username: username,
    Pw: password,
  })

  const data = res.data

  if (typeof window !== 'undefined') {
    localStorage.setItem('jellyfinAccessToken', data.AccessToken)
    localStorage.setItem('jellyfinUserId', data.User.Id)
    localStorage.setItem('jellyfinServerId', data.User.ServerId)
  }

  return data
}

export function getStoredCredentials(): { accessToken: string | null; userId: string | null } {
  if (typeof window === 'undefined') {
    return { accessToken: null, userId: null }
  }
  return {
    accessToken: localStorage.getItem('jellyfinAccessToken'),
    userId: localStorage.getItem('jellyfinUserId'),
  }
}

export function clearCredentials(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('jellyfinAccessToken')
  localStorage.removeItem('jellyfinUserId')
  localStorage.removeItem('jellyfinServerId')
}
