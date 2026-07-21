import { useState } from 'react'

interface CachedImageProps {
  type: 'tmdb' | 'avatar'
  src?: string | null
  alt?: string
  className?: string
  style?: React.CSSProperties
  tmdbSize?: string
}

const TMDB_BASE = 'https://image.tmdb.org/t/p'

export default function CachedImage({ type, src, alt = '', className = '', style, tmdbSize }: CachedImageProps) {
  const [error, setError] = useState(false)

  if (!src || error) {
    return (
      <div
        className={`flex items-center justify-center bg-dark-900 ${className}`}
        style={style}
      >
        <svg className="h-8 w-8 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v12h16V6H4zm2 2h12v8H6V8zm2 2v4h8v-4H8z" />
        </svg>
      </div>
    )
  }

  const imgSrc =
    type === 'tmdb'
      ? `${TMDB_BASE}/${tmdbSize || 'w300_and_h450_face'}${src}`
      : src

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      onError={() => setError(true)}
    />
  )
}