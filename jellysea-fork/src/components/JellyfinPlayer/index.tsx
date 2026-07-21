'use client'

import { useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

const JELLYFIN_PUBLIC_URL = 'https://watch.tecknet.dev'
const JELLYFIN_API_KEY = '56df1fb329894aaaa86f08c55ddeb1ca'

interface JellyfinPlayerProps {
  itemId: string
  title: string
  seasonNumber?: number
  episodeNumber?: number
  onClose: () => void
}

export default function JellyfinPlayer({
  itemId,
  title,
  seasonNumber,
  episodeNumber,
  onClose,
}: JellyfinPlayerProps) {
  const iframeUrl = `${JELLYFIN_PUBLIC_URL}/web/index.html?api_key=${JELLYFIN_API_KEY}#!/video/${itemId}.ts`

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const episodeLabel =
    seasonNumber !== undefined && episodeNumber !== undefined
      ? `S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`
      : null

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black">
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center gap-3 px-4 pt-4">
        <button
          onClick={handleClose}
          className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1.5 text-sm font-medium text-white/80 backdrop-blur-sm transition hover:bg-black/60 hover:text-white"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </button>
        <span className="text-sm font-semibold text-white drop-shadow-lg">
          {title}
        </span>
        {episodeLabel && (
          <span className="text-xs text-white/50">{episodeLabel}</span>
        )}
      </div>
      <iframe
        src={iframeUrl}
        className="h-full w-full border-0"
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture"
        title={title}
      />
    </div>,
    document.body
  )
}
