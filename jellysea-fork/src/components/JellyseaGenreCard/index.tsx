import { useState } from 'react'
import Link from 'next/link'

interface GenreCardProps {
  name: string
  image: string
  url: string
}

function GenreCard({ name, image, url }: GenreCardProps) {
  const [isHovered, setHovered] = useState(false)

  return (
    <Link href={url}>
      <div
        className={`relative flex h-32 w-56 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-cover bg-center p-8 shadow ring-1 transition duration-300 ease-in-out sm:h-36 sm:w-72 ${
          isHovered
            ? 'scale-105 bg-dark-800 ring-dark-500'
            : 'scale-100 bg-dark-900 ring-dark-600'
        }`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 z-10 h-full w-full bg-dark-900 transition duration-300"
        />
        <div className="relative z-20 w-full truncate whitespace-normal text-center text-2xl font-bold text-white sm:text-3xl">
          {name}
        </div>
      </div>
    </Link>
  )
}

export function GenreCardPlaceholder() {
  return (
    <div className="relative h-32 w-56 animate-pulse rounded-xl bg-dark-700 sm:h-36 sm:w-72" />
  )
}

export default GenreCard
