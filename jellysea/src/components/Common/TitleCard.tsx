import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import api from '@/utils/api'
import CachedImage from './CachedImage'
import type { MediaStatus, RatingResponse } from '@/utils/types'
import { CheckCircleIcon } from '@heroicons/react/20/solid'
import {
  BellIcon,
  ClockIcon,
  MinusSmallIcon,
  TrashIcon,
} from '@heroicons/react/24/solid'

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
      'bg-indigo-500 border-indigo-400 ring-indigo-400 text-indigo-100',
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

  const { data: ratingData } = useSWR<RatingResponse>(
    showDetail && mediaType === 'movie' ? `/movie/${id}/ratingscombined` : null,
    (url: string) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: false, dedupingInterval: 600000 }
  )

  const displayScore = ratingData?.imdb?.criticsScore ?? userScore

  return (
    <div className={canExpand ? 'w-full' : 'w-36 sm:w-36 md:w-44'}>
      <Link href={mediaType === 'movie' ? `/movie/${id}` : `/tv/${id}`}>
        <div
          className={`relative cursor-pointer rounded-xl bg-dark-900 shadow ring-1 transition duration-300 ${
            showDetail ? 'scale-105 shadow-lg ring-dark-500' : 'scale-100 shadow ring-dark-600'
          }`}
          style={{ paddingBottom: '150%' }}
          onMouseEnter={() => setShowDetail(true)}
          onMouseLeave={() => setShowDetail(false)}
        >
          <CachedImage
            type="tmdb"
            src={image}
            alt={title}
            className="absolute inset-0 h-full w-full rounded-xl object-cover"
          />

          {mediaType && (
            <div className="absolute left-2 top-2 rounded bg-dark/70 px-1.5 py-0.5 text-xs font-medium text-white">
              {mediaType === 'movie' ? 'MOVIE' : 'SERIES'}
            </div>
          )}

          {status && statusConfig[status] && (
            <div
              className={`absolute right-2 top-2 rounded-full shadow-md w-5 h-5 ring-1 flex items-center justify-center ${
                statusConfig[status].className
              }`}
            >
              {statusConfig[status].icon}
            </div>
          )}

          {showDetail && (
            <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-dark via-dark/60 to-transparent p-3 transition-opacity">
              <div className="flex h-full flex-col justify-end">
                <div className="text-sm font-bold text-white leading-tight mb-1 line-clamp-2">{title}</div>
                {year && <div className="text-xs text-slate-300 mb-1">{year}</div>}
                {displayScore !== undefined && displayScore > 0 && (
                  <div className="text-xs text-yellow-400 mb-1">
                    {Number(displayScore).toFixed(1)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}