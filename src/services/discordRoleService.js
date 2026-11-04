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

  // 1. BYPASS UNTUK LOCALHOST (Jalanin di npm run dev tanpa Access Denied)
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  if (isLocalhost) {
    // Bebas ubah ke 'ADMIN', 'MEMBER', atau 'WORKER' sesuai kebutuhan testing lokal lu
    return { role: 'ADMIN', title: 'ADMIN' }
  }

  // 2. UNTUK PRODUCTION (VERCEL) -> Tetap hit API Discord
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