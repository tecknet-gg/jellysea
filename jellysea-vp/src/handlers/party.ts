import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import type { Party, CreatePartyRequest } from '../store/partyStore'
import { getRoom } from '../store/roomStore'

const parties = new Map<string, Party>()

const router = Router()

router.get('/api/parties', (_req, res) => {
  const list: Party[] = []
  for (const party of parties.values()) {
    const room = getRoom(party.id)
    list.push({ ...party, memberCount: room?.peers.size ?? 0, passwordHash: undefined })
  }
  res.json(list)
})

router.post('/api/parties', (req, res) => {
  const body = req.body as CreatePartyRequest
  if (!body.name || !body.hostId || !body.hostName) {
    res.status(400).json({ error: 'name, hostId, and hostName are required' })
    return
  }

  const id = uuid().slice(0, 8)
  const party: Party = {
    id,
    name: body.name,
    hasPassword: !!body.password,
    hostId: body.hostId,
    hostName: body.hostName,
    hostAvatar: body.hostAvatar,
    status: 'waiting',
    memberCount: 1,
    createdAt: Date.now(),
  }

  if (body.password) {
    party.passwordHash = body.password
  }

  parties.set(id, party)
  res.status(201).json({ ...party, passwordHash: undefined } as Party)
})

router.get('/api/parties/:id', (req, res) => {
  const party = parties.get(req.params.id)
  if (!party) {
    res.status(404).json({ error: 'Party not found' })
    return
  }
  const room = getRoom(party.id)
  res.json({ ...party, memberCount: room?.peers.size ?? 0, passwordHash: undefined })
})

router.post('/api/parties/:id/auth', (req, res) => {
  const party = parties.get(req.params.id)
  if (!party) {
    res.status(404).json({ error: 'Party not found' })
    return
  }

  if (!party.passwordHash) {
    res.json({ ok: true })
    return
  }

  const { password } = req.body as { password?: string }
  if (password === party.passwordHash) {
    res.json({ ok: true })
  } else {
    res.status(401).json({ error: 'Invalid password' })
  }
})

export { router as partyRouter, parties }
