import { useCallback, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import api from '@app/utils/api'
import CachedImage from '@app/components/Common/CachedImage'
import RequestModal from '@app/components/RequestModal'
import { Permission, useUser } from '@app/hooks/useUser'
import { MediaStatus } from '@server/constants/media'
import type { RatingResponse } from '@app/utils/types'
import { CheckCircleIcon } from '@heroicons/react/20/solid'
import {
  ArrowDownTrayIcon,
  BellIcon,
  ClockIcon,
  MinusSmallIcon,
  TrashIcon,
} from '@heroicons/react/24/solid'
import { PlayIcon } from '@heroicons/react/24/solid'

interface TitleCardProps {
  id: number
  image?: string
  year?: string
  title: string
  userScore?: number
  mediaType: 'movie' | 'tv'
  status?: MediaStatus
  canExpand?: boolean
}

const statusConfig: Record<
  number,
  { icon: React.ReactNode; className: string }
> = {
  2: {
    icon: <BellIcon className="h-3 w-3" />,
    className: 'bg-yellow-500 border-yellow-400 ring-yellow-400 text-yellow-100',
  },
  3: {
    icon: <ClockIcon className="h-3 w-3" />,
    className:
      'bg-accent-500 border-accent-400 ring-accent-400 text-accent-100',
  },
  4: {
    icon: <MinusSmallIcon className="h-3 w-3" />,
    className:
      'bg-green-500 border-green-400 ring-green-400 text-green-100',
  },
  5: {
    icon: <CheckCircleIcon className="h-3 w-3" />,
    className:
      'bg-green-500 border-green-400 ring-green-400 text-green-100',
  },
  6: {
    icon: <TrashIcon className="h-3 w-3" />,
    className: 'bg-red-500 border-red-400 ring-red-400 text-red-100',
  },
}

export default function TitleCard({ id, image, year, title, userScore, mediaType, status, canExpand }: TitleCardProps) {
  const [showDetail, setShowDetail] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(status)
  const { hasPermission } = useUser()

  const { data: ratingData } = useSWR<RatingResponse>(
    showDetail && mediaType === 'movie' ? `/movie/${id}/ratingscombined` : null,
    (url: string) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: false, dedupingInterval: 600000 }
  )

  const displayScore = ratingData?.imdb?.criticsScore ?? userScore

  const showRequestButton = hasPermission(
    [Permission.REQUEST, Permission.REQUEST_MOVIE],
    { type: 'or' }
  )

  const requestComplete = useCallback((newStatus: MediaStatus) => {
    setCurrentStatus(newStatus)
    setShowRequestModal(false)
  }, [])

  return (
    <div className={canExpand ? 'w-full' : 'w-36 sm:w-36 md:w-44'}>
      <RequestModal
        tmdbId={id}
        show={showRequestModal}
        type={mediaType === 'movie' ? 'movie' : 'tv'}
        onComplete={requestComplete}
        onCancel={() => setShowRequestModal(false)}
      />
      <Link href={mediaType === 'movie' ? `/movie/${id}` : `/tv/${id}`}>
        <div
          className={`relative cursor-pointer rounded-xl bg-midnight-900 shadow ring-1 transition duration-300 ${
            showDetail ? 'scale-105 shadow-lg ring-midnight-600' : 'scale-100 shadow ring-midnight-700'
          }`}
          style={{ paddingBottom: '150%' }}
          onMouseEnter={() => setShowDetail(true)}
          onMouseLeave={() => setShowDetail(false)}
        >
          <CachedImage
            type="tmdb"
            src={image ?? ''}
            alt={title}
            className="absolute inset-0 h-full w-full rounded-xl object-cover"
          />

          {mediaType && (
            <div className="absolute left-2 top-2 rounded bg-dark/70 px-1.5 py-0.5 text-xs font-medium text-white">
              {mediaType === 'movie' ? 'MOVIE' : 'SERIES'}
            </div>
          )}

          {currentStatus && currentStatus !== MediaStatus.UNKNOWN && statusConfig[currentStatus] && (
            <div
              className={`absolute left-2 top-2 rounded-full shadow-md w-5 h-5 ring-1 flex items-center justify-center ${
                statusConfig[currentStatus].className
              }`}
            >
              {statusConfig[currentStatus].icon}
            </div>
          )}

          {showDetail && (
            <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-midnight-950 via-midnight-900/70 to-transparent p-2 transition-opacity">
              <div className="flex h-full flex-col justify-end">
                <div className="text-xs font-bold text-white leading-tight line-clamp-2">{title}</div>
                {year && <div className="text-[10px] text-slate-400 mt-0.5">{year}</div>}
                {displayScore !== undefined && displayScore > 0 && (
                  <div className="text-[10px] text-yellow-400 mt-0.5">{Number(displayScore).toFixed(1)}</div>
                )}
                {currentStatus === MediaStatus.AVAILABLE || currentStatus === MediaStatus.PARTIALLY_AVAILABLE ? (
                  <Link
                    href={mediaType === 'movie' ? `/movie/${id}` : `/tv/${id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 inline-flex items-center justify-center gap-1 rounded-md bg-accent-500 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-accent-600"
                  >
                    <PlayIcon className="h-3 w-3" />
                    Play
                  </Link>
                ) : (!currentStatus ||
                  currentStatus === MediaStatus.UNKNOWN ||
                  currentStatus === MediaStatus.DELETED) && showRequestButton ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowRequestModal(true)
                    }}
                    className="mt-1 inline-flex items-center justify-center gap-1 rounded-md bg-accent-500 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-accent-600"
                  >
                    <ArrowDownTrayIcon className="h-3 w-3" />
                    Request
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}