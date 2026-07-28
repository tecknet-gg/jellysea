import { ArrowsRightLeftIcon, LinkSlashIcon, LinkIcon } from '@heroicons/react/24/outline'

interface DriftOverlayProps {
  drift: number | null
  isHost: boolean
  isDetached: boolean
  hostPaused: boolean
  onResync: () => void
  onToggleDetach: () => void
}

export default function DriftOverlay({ drift, isHost, isDetached, hostPaused, onResync, onToggleDetach }: DriftOverlayProps) {
  if (isHost) {
    return (
      <div className="fixed right-4 top-4 z-[9999]">
        <div className="flex items-center gap-2 rounded-xl bg-black/80 px-3 py-1.5 shadow-lg backdrop-blur">
          <div className="h-2 w-2 rounded-full bg-accent-500" />
          <span className="text-xs font-medium text-white/80">Host</span>
        </div>
      </div>
    )
  }

  if (isDetached) {
    return (
      <div className="fixed right-4 top-4 z-[9999] flex gap-2">
        <div className="flex items-center gap-2 rounded-xl bg-black/80 px-3 py-1.5 shadow-lg backdrop-blur">
          <div className="h-2 w-2 rounded-full bg-gray-500" />
          <span className="text-xs font-medium text-white/80">Detached</span>
        </div>
        <button onClick={onToggleDetach} className="flex items-center gap-1 rounded-xl bg-black/80 px-2.5 py-1.5 text-xs text-white/60 shadow-lg backdrop-blur hover:text-white" title="Reattach">
          <LinkIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  const absDrift = drift !== null ? Math.abs(drift) : 0
  const color = drift === null ? 'bg-gray-500' : absDrift < 2 ? 'bg-green-500' : absDrift < 10 ? 'bg-yellow-500' : 'bg-red-500'

  const label = drift === null
    ? 'Calculating...'
    : hostPaused
      ? `Host paused ${drift > 0 ? `(+${drift}s)` : `(${drift}s)`}`
      : `${drift > 0 ? '+' : ''}${drift}s`

  return (
    <div className="fixed right-4 top-4 z-[9999] flex gap-2">
      <div className="flex items-center gap-2 rounded-xl bg-black/80 px-3 py-1.5 shadow-lg backdrop-blur">
        <div className={`h-2 w-2 rounded-full ${color}`} />
        <span className="text-xs font-medium text-white/80">{label}</span>
        <button onClick={onResync} className="ml-1 rounded px-1.5 py-0.5 text-xs font-medium text-accent-400 hover:bg-accent-500/20 hover:text-accent-300" title={hostPaused ? 'Sync to host position and pause' : 'Jump to host position'}>
          <ArrowsRightLeftIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      <button onClick={onToggleDetach} className="flex items-center gap-1 rounded-xl bg-black/80 px-2.5 py-1.5 text-xs text-white/60 shadow-lg backdrop-blur hover:text-white" title="Detach from host sync">
        <LinkSlashIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
