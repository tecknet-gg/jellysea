import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

interface CheckboxOption {
  value: string
  label: string
}

interface FilterCheckboxGroupProps {
  label: string
  options: CheckboxOption[]
  value: string
  onChange: (value: string) => void
}

export default function FilterCheckboxGroup({ label, options, value, onChange }: FilterCheckboxGroupProps) {
  const [open, setOpen] = useState(false)
  const selected = value ? value.split(',').filter(Boolean) : []

  const toggle = (val: string) => {
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val]
    onChange(next.join(','))
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between rounded-lg border border-dark-500 bg-dark-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <span className={selected.length === 0 ? 'text-slate-500' : ''}>
            {selected.length > 0 ? `${selected.length} selected` : `All ${label}`}
          </span>
          <ChevronDownIcon className="h-4 w-4 text-slate-400" />
        </button>
        {open && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-dark-500 bg-dark-800 shadow-lg">
            {options.map((opt) => {
              const checked = selected.includes(opt.value)
              return (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-dark-700"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt.value)}
                    className="h-4 w-4 rounded border-dark-500 bg-dark-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  {opt.label}
                </label>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}