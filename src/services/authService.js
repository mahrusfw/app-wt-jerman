import { supabase } from '../config/supabaseClient'

// 1. Trigger Login Discord
export const loginWithDiscord = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: window.location.origin
    }
  })
  if (error) console.error('Login error:', error.message)
}

// 2. Logout
export const logout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) console.error('Logout error:', error.message)
}

// 3. Ambil data session user saat ini
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}