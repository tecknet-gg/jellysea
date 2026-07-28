'use client'

import { useEffect, useState } from 'react'

export function useIsTauri(): boolean {
  const [isTauri, setIsTauri] = useState(false)

  useEffect(() => {
    setIsTauri(
      typeof window !== 'undefined' &&
      typeof (window as unknown as Record<string, unknown>).__TAURI__ !== 'undefined'
    )
  }, [])

  return isTauri
}

let tauriCore: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> } | null = null

async function getTauriCore() {
  if (!tauriCore) {
    tauriCore = await import('@tauri-apps/api/core')
  }
  return tauriCore
}

export async function tauriInvoke(cmd: string, args?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    const core = await getTauriCore()
    return core.invoke(cmd, args)
  }
  throw new Error('Not running in Tauri')
}
