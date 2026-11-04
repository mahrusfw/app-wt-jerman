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

// 4. Ambil Profil Detail User dari tabel profiles
export const getUserProfile = async (discordId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', discordId)
    .single()

  if (error) {
    console.error('Gagal mengambil detail profile:', error.message)
    return null
  }
  return data
}

// 5. Update Nama IC ke User Metadata & Sync ke tabel public.profiles
export const updateIcName = async (icName) => {
  const { data, error } = await supabase.auth.updateUser({
    data: { ic_name: icName }
  })
  if (error) throw error

  const user = data.user
  const discordId = user.user_metadata?.provider_id || user.user_metadata?.sub || user.id

  await supabase
    .from('profiles')
    .update({ ic_name: icName })
    .eq('id', discordId)

  return data.user
}

// 6. Ambil Semua Data Profile dari Tabel profiles
export const getAllProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Gagal mengambil profiles:', error.message)
    return []
  }
  return data
}

// 7. Admin Update Role & Title (Jabatan) ke Tabel profiles
export const updateProfileRoleAndTitle = async (discordId, role, title) => {
  const { error } = await supabase
    .from('profiles')
    .update({ role, title })
    .eq('id', discordId)
    
  if (error) console.error('Gagal update profile:', error.message)
}

// 8. Admin Hapus Profile Anggota dari Tabel profiles
export const deleteProfile = async (discordId) => {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', discordId)

  if (error) {
    console.error('Gagal menghapus profile:', error.message)
    throw error
  }
}