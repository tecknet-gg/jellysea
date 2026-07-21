interface FilterCertificationProps {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}

export default function FilterCertification({ label, options, value, onChange }: FilterCertificationProps) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(active ? '' : opt.value)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'border border-dark-500 bg-dark-800 text-slate-300 hover:bg-dark-700'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}