export async function fetchUserDiscordRole(user) {
  const discordIdentity = user?.identities?.find((identity) => identity.provider === 'discord')
  const possibleDiscordIds = [
    user?.user_metadata?.provider_id,
    discordIdentity?.id,
    discordIdentity?.identity_data?.sub,
    user?.user_metadata?.sub
  ]
  const discordUserId = possibleDiscordIds.find(
    (id) => typeof id === 'string' && /^\d{17,20}$/.test(id)
  )

  if (!discordUserId) return { role: 'OUTSIDER', title: 'OUTSIDER' }

  const response = await fetch('/api/sync-roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: discordUserId })
  })

  if (!response.ok) {
    const { error } = await response.json()
    throw new Error(error || 'Discord role verification failed')
  }

  const data = await response.json()
  return { role: data.role, title: data.title }
}