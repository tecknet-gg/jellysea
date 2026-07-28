import { MediaStatus } from '@app/utils/types'
import type { DownloadingItem } from '@app/utils/types'

interface StatusBadgeProps {
  status?: MediaStatus
  downloadItem?: DownloadingItem[]
  is4k?: boolean
  inProgress?: boolean
  plexUrl?: string
  serviceUrl?: string
  tmdbId?: number
  mediaType?: 'movie' | 'tv'
  title?: string
}

const badgeBase =
  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold leading-5 cursor-default'

const badgeStyles: Record<MediaStatus, string> = {
  [MediaStatus.AVAILABLE]:
    'bg-green-500 border border-green-500 text-green-100',
  [MediaStatus.PARTIALLY_AVAILABLE]:
    'bg-green-500 border border-green-500 text-green-100',
  [MediaStatus.PROCESSING]:
    'bg-accent-500 border border-accent-500 text-accent-100',
  [MediaStatus.PENDING]:
    'bg-yellow-500 border border-yellow-500 text-yellow-100',
  [MediaStatus.UNKNOWN]:
    'bg-dark-600 border border-dark-500 text-white',
  [MediaStatus.DELETED]:
    'bg-red-500 border border-red-500 text-red-100',
  [MediaStatus.BLOCKLISTED]:
    'bg-red-500 border border-red-500 text-red-100',
}

const statusLabels: Record<MediaStatus, string> = {
  [MediaStatus.AVAILABLE]: 'Available',
  [MediaStatus.PARTIALLY_AVAILABLE]: 'Partially Available',
  [MediaStatus.PROCESSING]: 'Requested',
  [MediaStatus.PENDING]: 'Pending',
  [MediaStatus.UNKNOWN]: 'Unknown',
  [MediaStatus.DELETED]: 'Deleted',
  [MediaStatus.BLOCKLISTED]: 'Blocklisted',
}

export default function StatusBadge({
  status,
  is4k = false,
}: StatusBadgeProps) {
  if (!status || status === MediaStatus.UNKNOWN) return null

  const badgeClass = badgeStyles[status] || badgeStyles[MediaStatus.UNKNOWN]
  const label = statusLabels[status] || 'Unknown'

  return (
    <div className={`${badgeBase} ${badgeClass}`}>
      <span>
        {is4k && <span className="mr-1">4K</span>}
        {status === MediaStatus.PROCESSING ? 'Requested' : label}
      </span>
    </div>
  )
}
