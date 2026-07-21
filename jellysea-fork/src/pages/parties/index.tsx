import { useState, useEffect, useCallback } from 'react'
import { useUser, Permission } from '@app/hooks/useUser'
import Header from '@app/components/Common/Header'
import LoadingSpinner from '@app/components/Common/LoadingSpinner'
import PartyCard from '@app/components/WatchParty/PartyCard'
import CreatePartyModal from '@app/components/WatchParty/CreatePartyModal'
import { fetchParties, createParty, deleteParty } from '@app/utils/partyApi'
import type { Party } from '@app/utils/partyTypes'
import { TrashIcon } from '@heroicons/react/24/outline'
import type { NextPage } from 'next'

const PartiesPage: NextPage = () => {
  const { user, hasPermission } = useUser()
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchParties()
      setParties(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load parties')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [load])

  const handleCreate = async (data: { name: string; password?: string }) => {
    await createParty({
      ...data,
      hostId: user?.id?.toString() || '',
      hostName: user?.displayName || user?.username || 'Anonymous',
      hostAvatar: user?.avatar,
    })
    await load()
  }

  const handleDelete = useCallback(async (partyId: string) => {
    await deleteParty(partyId)
    await load()
  }, [load])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Header>Watch Parties</Header>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:from-indigo-500 hover:to-purple-500"
        >
          Create Party
        </button>
      </div>

      {loading && <LoadingSpinner />}

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && parties.length === 0 && (
        <div className="mt-16 text-center">
          <p className="text-lg text-slate-400">No active parties</p>
        </div>
      )}

      {parties.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {parties.map((party) => (
            <div key={party.id} className="relative group">
              <PartyCard party={party} />
              {(hasPermission(Permission.ADMIN) || String(user?.id) === party.hostId) && (
                <button
                  onClick={() => {
                    if (window.confirm(`End "${party.name}"? Everyone will be disconnected.`))
                      handleDelete(party.id)
                  }}
                  className="absolute right-2 top-2 z-10 rounded-lg bg-red-500/20 p-1.5 text-red-400 opacity-0 transition hover:bg-red-500/30 group-hover:opacity-100"
                  title="End party"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <CreatePartyModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
      />
    </div>
  )
}

export default PartiesPage
