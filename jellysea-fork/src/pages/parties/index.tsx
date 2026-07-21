import { useState, useEffect, useCallback } from 'react'
import { useUser, Permission } from '@app/hooks/useUser'
import Header from '@app/components/Common/Header'
import LoadingSpinner from '@app/components/Common/LoadingSpinner'
import PartyCard from '@app/components/WatchParty/PartyCard'
import CreatePartyModal from '@app/components/WatchParty/CreatePartyModal'
import { fetchParties, createParty } from '@app/utils/partyApi'
import type { Party } from '@app/utils/partyTypes'
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
          <p className="text-lg text-slate-400">No active watch parties</p>
          <p className="mt-1 text-sm text-slate-500">
            Create one and invite your friends to watch together!
          </p>
        </div>
      )}

      {parties.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {parties.map((party) => (
            <PartyCard key={party.id} party={party} />
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
