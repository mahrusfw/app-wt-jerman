import { createClient } from '@supabase/supabase-js'

const ADMIN_ROLES = new Set([
  'NABI',
  'INCENSE MASTER',
  'TIGER HEAD',
  'SHADOW OG',
  'SECRETARY',
  'BUSINESS KEEPER',
  'BUSSINESS KEEPER',
  'CAPO',
  'ADMIN'
])
const WORKER_ROLES = new Set(['WORKER', 'WORKERS', 'REPAIR'])
const MEMBER_ROLES = new Set([
  'STREET KING',
  'STREET KIING',
  'STREET COMMANDER',
  'ORDINARY MEMBER',
  'MEMBER'
])
const BABY_ROLES = new Set(['BABY TIGER', 'BABY'])
const SHIFU_ROLE = 'SHIFU'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body
    if (typeof userId !== 'string' || !/^\d{17,20}$/.test(userId)) {
      return res.status(400).json({ error: 'Valid Discord user ID missing' })
    }

    const { DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = globalThis.process.env
    if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Discord role sync configuration is incomplete')
      return res.status(500).json({ error: 'Role verification is not configured' })
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const headers = { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
    const discordRes = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${userId}`, {
      headers
    })

    if (discordRes.status === 404) {
      const { error } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
      if (error) throw error
      return res.status(200).json({ role: 'OUTSIDER', title: 'OUTSIDER' })
    }
    if (!discordRes.ok) {
      console.error('Discord member lookup failed:', discordRes.status)
      return res.status(502).json({ error: 'Could not verify Discord server membership' })
    }

    const memberData = await discordRes.json()
    const memberRoles = memberData.roles
    const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/roles`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
    })
    if (!rolesRes.ok) {
      console.error('Discord role lookup failed:', rolesRes.status)
      return res.status(502).json({ error: 'Could not load Discord server roles' })
    }

    const guildRoles = await rolesRes.json()
    const userGuildRoles = guildRoles
      .filter((r) => memberRoles.includes(r.id))
      .sort((a, b) => b.position - a.position)

    const normalizedRoles = userGuildRoles.map((role) => ({
      name: role.name.trim().replace(/\s+/g, ' ').toUpperCase(),
      title: role.name.trim().replace(/\s+/g, ' ').toUpperCase()
    }))
    const match = (allowedRoles, category) => {
      const role = normalizedRoles.find((candidate) => allowedRoles.has(candidate.name))
      return role ? { ...role, category } : null
    }
    const shifuRole = normalizedRoles.find((role) => role.name === SHIFU_ROLE)
    const matchedRole = match(ADMIN_ROLES, 'ADMIN')
      || match(WORKER_ROLES, 'WORKER')
      || (shifuRole && { ...shifuRole, category: 'MEMBER', title: 'SHIFUNAY' })
      || match(MEMBER_ROLES, 'MEMBER')
      || match(BABY_ROLES, 'BABY')

    if (!matchedRole) {
      const { error } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
      if (error) throw error
      return res.status(200).json({ role: 'OUTSIDER', title: 'OUTSIDER' })
    }

    const { error } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      role: matchedRole.category,
      title: matchedRole.title
    })
    if (error) throw error

    return res.status(200).json({ role: matchedRole.category, title: matchedRole.title })

  } catch (err) {
    console.error('Error sync role:', err)
    return res.status(500).json({ error: 'Role verification failed' })
  }
}