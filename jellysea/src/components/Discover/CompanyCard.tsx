import { useRouter } from 'next/router'

interface CompanyCardProps {
  name: string
  image: string
  url: string
}

export default function CompanyCard({ name, image, url }: CompanyCardProps) {
  const router = useRouter()

  return (
    <div
      className="relative inline-flex w-56 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl bg-dark-900/60 p-6 transition hover:bg-dark-800/60"
      onClick={() => router.push(url)}
    >
      <img
        src={image}
        alt={name}
        className="mb-3 h-12 w-full object-contain"
        loading="lazy"
      />
      <div className="text-sm font-semibold text-slate-300">{name}</div>
    </div>
  )
}
