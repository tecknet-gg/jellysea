interface FilterRangeProps {
  label: string
  fromValue: string
  toValue: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  placeholder?: string
}

export default function FilterRange({ label, fromValue, toValue, onFromChange, onToChange, placeholder = '' }: FilterRangeProps) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={fromValue}
          onChange={(e) => onFromChange(e.target.value)}
          placeholder={placeholder || 'From'}
          className="w-full rounded-lg border border-dark-500 bg-dark-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <span className="text-slate-500">-</span>
        <input
          type="text"
          value={toValue}
          onChange={(e) => onToChange(e.target.value)}
          placeholder={placeholder || 'To'}
          className="w-full rounded-lg border border-dark-500 bg-dark-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  )
}
