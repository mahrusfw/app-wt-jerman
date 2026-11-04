import { supabase } from '../config/supabaseClient'

// === 1. FITUR BRANKAS (ITEM & INVENTORY) ===
export const getVaultLogs = async () => {
  const { data, error } = await supabase
    .from('vault_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching vault logs:', error.message)
    return []
  }
  return data
}

export const addVaultLog = async (logData) => {
  const { error } = await supabase
    .from('vault_logs')
    .insert([logData])

  if (error) throw error
  return true
}

// === 2. FITUR KEUANGAN BISNIS ===
export const getFinanceLogs = async () => {
  const { data, error } = await supabase
    .from('finance_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching finance logs:', error.message)
    return []
  }
  return data
}

export const addFinanceLog = async (financeData) => {
  const { error } = await supabase
    .from('finance_logs')
    .insert([financeData])

  if (error) throw error
  return true
}

// === 3. KATALOG HARGA BISNIS ===
export const getBusinessPrices = async () => {
  const { data, error } = await supabase
    .from('business_prices')
    .select('*')
    .order('item_name', { ascending: true })

  if (error) return []
  return data
}