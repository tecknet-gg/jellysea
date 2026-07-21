import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface FilterSelectOption {
  value: string
  label: string
}

interface FilterSelectProps {
  label: string
  options: FilterSelectOption[]
  value: string
  onChange: (value: string) => void
}

export default function FilterSelect({ label, options, value, onChange }: FilterSelectProps) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-dark-500 bg-dark-800 px-3 py-2 pr-8 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  )
}

export const LANGUAGE_OPTIONS = [
  { value: '', label: 'All Languages' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ru', label: 'Russian' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
  { value: 'sv', label: 'Swedish' },
  { value: 'da', label: 'Danish' },
  { value: 'no', label: 'Norwegian' },
  { value: 'nl', label: 'Dutch' },
  { value: 'pl', label: 'Polish' },
  { value: 'tr', label: 'Turkish' },
  { value: 'th', label: 'Thai' },
  { value: 'vi', label: 'Vietnamese' },
]

export const MOVIE_CERTIFICATION_OPTIONS = [
  { value: 'G', label: 'G' },
  { value: 'PG', label: 'PG' },
  { value: 'PG-13', label: 'PG-13' },
  { value: 'R', label: 'R' },
  { value: 'NC-17', label: 'NC-17' },
]

export const TV_CERTIFICATION_OPTIONS = [
  { value: 'TV-Y', label: 'TV-Y' },
  { value: 'TV-Y7', label: 'TV-Y7' },
  { value: 'TV-G', label: 'TV-G' },
  { value: 'TV-PG', label: 'TV-PG' },
  { value: 'TV-14', label: 'TV-14' },
  { value: 'TV-MA', label: 'TV-MA' },
]

export const TV_STATUS_OPTIONS = [
  { value: 'Returning Series', label: 'Returning Series' },
  { value: 'Planned', label: 'Planned' },
  { value: 'In Production', label: 'In Production' },
  { value: 'Ended', label: 'Ended' },
  { value: 'Canceled', label: 'Canceled' },
  { value: 'Pilot', label: 'Pilot' },
]

export const REGION_OPTIONS = [
  { value: '', label: 'All Regions' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'JP', label: 'Japan' },
  { value: 'KR', label: 'South Korea' },
  { value: 'IN', label: 'India' },
  { value: 'BR', label: 'Brazil' },
  { value: 'MX', label: 'Mexico' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'SE', label: 'Sweden' },
  { value: 'NO', label: 'Norway' },
  { value: 'DK', label: 'Denmark' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'PL', label: 'Poland' },
  { value: 'RU', label: 'Russia' },
  { value: 'TR', label: 'Turkey' },
  { value: 'AR', label: 'Argentina' },
  { value: 'ZA', label: 'South Africa' },
]