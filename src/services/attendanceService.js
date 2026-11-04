import { supabase } from '../config/supabaseClient'

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