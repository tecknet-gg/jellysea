import { useRef, useState, useCallback } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface SliderProps {
  sliderKey: string
  items?: React.ReactNode[]
  isLoading: boolean
  isEmpty?: boolean
  emptyMessage?: React.ReactNode
  placeholder?: React.ReactNode
}

function DefaultPlaceholder() {
  return (
    <div className="w-36 sm:w-36 md:w-44">
      <div className="relative rounded-xl bg-dark-900" style={{ paddingBottom: '150%' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-accent-500 border-t-transparent" />
        </div>
      </div>
    </div>
  )
}

export default function Slider({
  sliderKey,
  items,
  isLoading,
  isEmpty,
  emptyMessage,
  placeholder = <DefaultPlaceholder />,
}: SliderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isStart, setIsStart] = useState(true)
  const [isEnd, setIsEnd] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    setIsStart(el.scrollLeft <= 1)
    setIsEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 1)
  }, [])

  const slide = (direction: 'left' | 'right') => {
    const el = containerRef.current
    if (!el) return
    const cardWidth = 200
    const visible = Math.floor(el.clientWidth / cardWidth)
    const scrollAmount = cardWidth * Math.max(1, visible)
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  return (
    <div className="relative" data-testid="media-slider">
      <div className="absolute right-0 -mt-10 flex text-slate-400">
        <button
          disabled={isStart}
          onClick={() => slide('left')}
          className="disabled:opacity-30"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
        <button
          disabled={isEnd}
          onClick={() => slide('right')}
          className="disabled:opacity-30"
        >
          <ChevronRightIcon className="h-6 w-6" />
        </button>
      </div>

      <div
        className="hide-scrollbar relative -my-2 -ml-4 -mr-4 overflow-y-auto overflow-x-scroll overscroll-x-contain whitespace-nowrap px-2 py-2"
        ref={containerRef}
        onScroll={updateScrollState}
      >
        {items?.map((item, i) => (
          <div key={`${sliderKey}-${i}`} className="inline-block px-2 align-top">
            {item}
          </div>
        ))}
        {isLoading &&
          Array.from({ length: 10 }).map((_, i) => (
            <div key={`placeholder-${i}`} className="inline-block px-2 align-top">
              {placeholder}
            </div>
          ))}
        {isEmpty && (
          <div className="mb-16 mt-16 text-center font-medium text-slate-400">
            {emptyMessage || 'No items to display'}
          </div>
        )}
      </div>
    </div>
  )
}
