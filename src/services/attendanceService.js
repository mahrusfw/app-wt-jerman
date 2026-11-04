import { supabase } from '../config/supabaseClient'

// 1. Ambil Semua Data Absensi
export const getAttendances = async () => {
  const { data, error } = await supabase
    .from('attendances')
    .select('*')
    .order('clock_in', { ascending: false })

  if (error) {
    console.error('Error fetching attendances:', error)
    return []
  }
  return data
}

// 2. Tambah Absensi Baru
export const addAttendance = async (formData) => {
  const { data, error } = await supabase
    .from('attendances')
    .insert([
      {
        member_name: formData.member_name,
        member_type: formData.member_type, // 'WORKER' atau 'MEMBER'
        type: formData.type,               // 'BANGUN' atau 'TIDUR'
        activity: formData.activity,
        proof_url: formData.proof_url
      }
    ])
    .select()

  if (error) {
    console.error('Error adding attendance:', error)
    throw error
  }
  return data
}

// 3. Update Record Absensi
export const updateAttendance = async (id, updateData) => {
  const { data, error } = await supabase
    .from('attendances')
    .update(updateData)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error updating attendance:', error)
    throw error
  }
  return data
}

// 4. Hapus Record Absensi
export const deleteAttendance = async (id) => {
  const { error } = await supabase
    .from('attendances')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting attendance:', error)
    throw error
  }
}