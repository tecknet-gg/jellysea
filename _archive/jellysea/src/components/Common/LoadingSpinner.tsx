export default function LoadingSpinner() {
  return (
    <div className="flex h-full min-h-[200px] w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-500 border-t-transparent" />
    </div>
  )
}