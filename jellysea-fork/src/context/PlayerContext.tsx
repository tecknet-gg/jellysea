'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface PlayerContextType {
  playerActive: boolean
  setPlayerActive: (active: boolean) => void
}

const PlayerContext = createContext<PlayerContextType>({
  playerActive: false,
  setPlayerActive: () => {},
})

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const [playerActive, setPlayerActive] = useState(false)

  return (
    <PlayerContext.Provider value={{ playerActive, setPlayerActive }}>
      {children}
    </PlayerContext.Provider>
  )
}

export const usePlayer = () => useContext(PlayerContext)
