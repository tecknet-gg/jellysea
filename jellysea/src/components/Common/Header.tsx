interface HeaderProps {
  children: React.ReactNode
  subtext?: string
}

export default function Header({ children, subtext }: HeaderProps) {
  return (
    <div className="mt-4 md:flex md:items-center md:justify-between">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-2xl font-bold leading-7 text-white sm:overflow-visible sm:text-4xl sm:leading-9">
          <span className="bg-gradient-to-br from-indigo-500 to-purple-500 bg-clip-text text-transparent">
            {children}
          </span>
        </h2>
        {subtext && <div className="mt-2 text-slate-400">{subtext}</div>}
      </div>
    </div>
  )
}