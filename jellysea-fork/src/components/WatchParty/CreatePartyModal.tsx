import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface CreatePartyModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: { name: string; password?: string }) => Promise<void>
}

export default function CreatePartyModal({ open, onClose, onSubmit }: CreatePartyModalProps) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [hasPassword, setHasPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        name: name.trim(),
        password: hasPassword ? password.trim() : undefined,
      })
      setName('')
      setPassword('')
      setHasPassword(false)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create party')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-md rounded-2xl bg-dark-900 p-6 shadow-xl ring-1 ring-dark-600">
              <div className="mb-4 flex items-center justify-between">
                <Dialog.Title className="text-lg font-bold text-white">
                  Create Watch Party
                </Dialog.Title>
                <button onClick={onClose} className="text-slate-400 hover:text-white">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Party Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="tecknet's basement"
                    maxLength={50}
                    required
                    className="w-full rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={hasPassword}
                      onChange={(e) => setHasPassword(e.target.checked)}
                      className="rounded border-dark-600 bg-dark-800 text-indigo-500 focus:ring-indigo-500"
                    />
                    Password protect
                  </label>
                  {hasPassword && (
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Party password"
                      className="mt-2 w-full rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  )}
                </div>

                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-lg border border-dark-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-dark-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim() || submitting}
                    className="flex-1 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Party'}
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
