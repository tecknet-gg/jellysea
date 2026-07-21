import Link from 'next/link'
import CachedImage from '@app/components/Common/CachedImage'
import type { Party, PartyStatus } from '@app/utils/partyTypes'

const STATUS_LABELS: Record<PartyStatus, string> = {
  waiting: 'Waiting for media',
  ready: 'Ready to watch',
  watching: 'Watching',
  paused: 'Paused',
}

const STATUS_STYLES: Record<PartyStatus, string> = {
  waiting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  ready: 'bg-green-500/20 text-green-400 border-green-500/30',
  watching: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  paused: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

function StatusBadge({ status }: { status: PartyStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

export default function PartyCard({ party }: { party: Party }) {
  return (
    <Link
      href={`/parties/${party.id}`}
      className="relative flex w-72 overflow-hidden rounded-xl bg-dark-900 bg-cover bg-center p-4 text-slate-400 shadow ring-1 ring-dark-600 transition hover:ring-indigo-500/50 sm:w-96"
    >
      {party.media?.backdropPath && (
        <div className="absolute inset-0 z-0">
          <CachedImage
            type="tmdb"
            src={party.media.backdropPath}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(135deg, rgba(8, 12, 24, 0.47) 0%, rgba(8, 12, 24, 1) 75%)',
            }}
          />
        </div>
      )}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col pr-4">
        <div className="text-xs font-medium text-slate-500">
          {party.memberCount} {party.memberCount === 1 ? 'member' : 'members'}
        </div>

        <div className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-base font-bold text-white sm:text-lg">
          {party.name}
        </div>

        <div className="mt-1 flex items-center gap-1.5">
          {party.hostAvatar && (
            <CachedImage
              type="avatar"
              src={party.hostAvatar}
              alt={party.hostName}
              className="h-5 w-5 flex-shrink-0 rounded-full object-cover"
            />
          )}
          <span className="truncate text-sm font-semibold text-slate-300">
            {party.hostName}
          </span>
        </div>

        {party.media && (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="truncate text-xs text-slate-400">
              {party.media.title}
            </span>
          </div>
        )}

        <div className="mt-2 flex items-center gap-2">
          <StatusBadge status={party.status} />
        </div>
      </div>

      {party.media?.posterPath && (
        <div className="w-14 flex-shrink-0 overflow-hidden rounded-md shadow-sm sm:w-20">
          <CachedImage
            type="tmdb"
            src={party.media.posterPath}
            alt=""
            className="w-full"
            style={{ aspectRatio: '600/900' }}
          />
        </div>
      )}
    </Link>
  )
}
