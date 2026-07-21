import { ArrowsRightLeftIcon, LinkSlashIcon, LinkIcon } from '@heroicons/react/24/outline'

interface DriftOverlayProps {
  drift: number | null
  isHost: boolean
  isDetached: boolean
  onResync: () => void
  onToggleDetach: () => void
}

export default function DriftOverlay({ drift, isHost, isDetached, onResync, onToggleDetach }: DriftOverlayProps) {
  const color = isHost ? 'bg-indigo-500' : drift === null || isDetached ? 'bg-gray-500' : Math.abs(drift) < 2 ? 'bg-green-500' : Math.abs(drift) < 5 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="fixed right-4 top-4 z-[9999] flex gap-2">
      <div className="flex items-center gap-2 rounded-xl bg-black/80 px-3 py-1.5 shadow-lg backdrop-blur">
        <div className={`h-2 w-2 rounded-full ${color}`} />
        <span className="text-xs font-medium text-white/80">
          {isHost ? 'Host' : isDetached ? 'Detached' : drift === null ? 'Synced' : `${drift > 0 ? '+' : ''}${drift}s`}
        </span>
        {!isHost && !isDetached && drift !== null && Math.abs(drift) > 2 && (
          <button onClick={onResync} className="ml-1 rounded p-0.5 text-white/60 hover:text-white" title="Resync">
            <ArrowsRightLeftIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {!isHost && (
        <button onClick={onToggleDetach} className="flex items-center gap-1 rounded-xl bg-black/80 px-2.5 py-1.5 text-xs text-white/60 shadow-lg backdrop-blur hover:text-white" title={isDetached ? 'Reattach' : 'Detach'}>
          {isDetached ? <LinkIcon className="h-3.5 w-3.5" /> : <LinkSlashIcon className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  )
}
