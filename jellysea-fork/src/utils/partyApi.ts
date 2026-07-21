import axios from 'axios'
import type { Party, CreatePartyRequest, PartyMedia } from './partyTypes'

const BASE_URL =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SIGNALING_URL
    ? process.env.NEXT_PUBLIC_SIGNALING_URL.replace(/^ws/, 'https')
    : 'https://test.tecknet.dev/vp'

const api = axios.create({ baseURL: BASE_URL })

export async function fetchParties(): Promise<Party[]> {
  const { data } = await api.get<Party[]>('/api/parties')
  return data
}

export async function createParty(req: CreatePartyRequest): Promise<Party> {
  const { data } = await api.post<Party>('/api/parties', req)
  return data
}

export async function getParty(id: string): Promise<Party> {
  const { data } = await api.get<Party>(`/api/parties/${id}`)
  return data
}

export async function checkPartyPassword(id: string, password: string): Promise<boolean> {
  try {
    const { data } = await api.post<{ ok: boolean }>(`/api/parties/${id}/auth`, { password })
    return data.ok
  } catch {
    return false
  }
}

export async function updatePartyMedia(id: string, media: PartyMedia): Promise<Party> {
  const { data } = await api.patch<Party>(`/api/parties/${id}`, { media })
  return data
}

export async function updatePartyStatus(id: string, status: Party['status']): Promise<Party> {
  const { data } = await api.patch<Party>(`/api/parties/${id}`, { status })
  return data
}

export async function deleteParty(id: string): Promise<void> {
  await api.delete(`/api/parties/${id}`)
}
