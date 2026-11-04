import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fnnoxwoqaoxkicisutdq.supabase.co' 
const supabaseKey = 'sb_publishable_EkJmaS8Bl1vnVUgH5moeAw_gNcJ9KSO' 

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    flowType: 'pkce'
  }
})