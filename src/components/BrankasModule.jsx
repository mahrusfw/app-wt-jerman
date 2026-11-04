import { useState, useEffect } from 'react'
import { getVaultLogs, addVaultLog } from '../services/vaultAndFinanceService'
import { getCurrentUser, getUserProfile } from '../services/authService'

export default function BrankasModule() {
  const [logs, setLogs] = useState([])
  const [memberName, setMemberName] = useState('')
  const [userRole, setUserRole] = useState('WORKER')
  const [userTitle, setUserTitle] = useState('')

  const [vaultType, setVaultType] = useState('BRANKAS_WT') // BRANKAS_WT / BRANKAS_BOSS
  const [actionType, setActionType] = useState('DEPOSIT')  // DEPOSIT / WITHDRAW / KEBUTUHAN
  const [itemName, setItemName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [proofUrl, setProofUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const data = await getVaultLogs()
    setLogs(data)
    
    const currUser = await getCurrentUser()
    if (currUser) {
      if (currUser.user_metadata?.ic_name) {
        setMemberName(currUser.user_metadata.ic_name)
      }
      
      const discordId = currUser.user_metadata?.provider_id || currUser.user_metadata?.sub || currUser.id
      const prof = await getUserProfile(discordId)
      if (prof) {
        setUserRole(prof.role || 'WORKER')
        setUserTitle(prof.title || '')
      }
    }
  }

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Cek apakah user adalah ADMIN
  const isAdmin = userRole === 'ADMIN'

  // Cek apakah user rank di bawah Capo (Member, Shifu, Worker, Baby Tiger)
  const titleUpper = (userTitle || '').toUpperCase()
  const isBelowCapo = !titleUpper.includes('CAPO') && 
                      !titleUpper.includes('TIGER HEAD') && 
                      !titleUpper.includes('BOSS') && 
                      !titleUpper.includes('HIGH COMMAND') && 
                      !isAdmin

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!memberName) return showToast('Nama IC belum diset di profil!', 'error')
    
    // Validasi Brankas Boss: Hanya Admin
    if (vaultType === 'BRANKAS_BOSS' && !isAdmin) {
      return showToast('Akses Ditolak! Brankas Boss khusus Admin.', 'error')
    }

    // Validasi Brankas Utama: Hanya rank di bawah Capo
    if (vaultType === 'BRANKAS_WT' && !isBelowCapo && !isAdmin) {
      return showToast('Brankas Utama dikhususkan untuk member di bawah Capo.', 'error')
    }

    if (!itemName.trim()) return showToast('Nama item wajib diisi!', 'error')
    if (actionType !== 'KEBUTUHAN' && !proofUrl.trim()) {
      return showToast('Link Bukti Screenshot Wajib untuk Deposit/Withdraw!', 'error')
    }

    setLoading(true)
    try {
      await addVaultLog({
        member_name: memberName,
        vault_type: vaultType,
        action_type: actionType,
        item_name: itemName.trim(),
        quantity: parseInt(quantity),
        proof_url: proofUrl.trim(),
        notes: notes.trim()
      })
      showToast(`Record ${actionType} ${itemName} berhasil dibuat!`)
      setItemName('')
      setQuantity(1)
      setProofUrl('')
      setNotes('')
      fetchData()
    } catch (err) {
      showToast('Gagal menyimpan log brankas.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // FILTER LOG PADA TABEL:
  // - Jika ADMIN: Bisa lihat SEMUA log (Brankas Utama & Brankas Boss)
  // - Jika Non-Admin (Member/Shifu/Worker/Baby Tiger): HANYA BISA LIHAT Brankas Utama (WT), Brankas Boss disembunyikan total
  const visibleLogs = logs.filter(item => {
    if (!isAdmin && item.vault_type === 'BRANKAS_BOSS') return false
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, padding: '12px 20px', borderRadius: '4px', backgroundColor: '#111319', border: `1px solid ${toast.type === 'error' ? '#ef4444' : '#10b981'}`, color: toast.type === 'error' ? '#ef4444' : '#10b981', fontFamily: 'var(--font-display)', zIndex: 99999 }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '28px' }}>
        
        {/* Form Input Brankas */}
        <div style={{ padding: '24px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--hairline)', borderRadius: '4px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: '#00f0ff', margin: '0 0 16px 0', fontSize: '14px' }}>
            📦 LOG BRANKAS BARANG
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Tipe Brankas */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>TIPE BRANKAS</label>
              <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr', gap: '6px', marginTop: '6px' }}>
                
                {/* Brankas Utama hanya untuk rank di bawah Capo (atau Admin) */}
                {(isBelowCapo || isAdmin) && (
                  <button 
                    type="button" 
                    onClick={() => setVaultType('BRANKAS_WT')} 
                    style={{ 
                      padding: '8px', 
                      fontSize: '10px', 
                      backgroundColor: vaultType === 'BRANKAS_WT' ? '#00f0ff' : 'transparent', 
                      color: vaultType === 'BRANKAS_WT' ? '#000' : '#fff', 
                      border: '1px solid var(--hairline)', 
                      fontWeight: 'bold' 
                    }}
                  >
                    BRANKAS UTAMA (WT)
                  </button>
                )}

                {/* Brankas Boss KHUSUS ADMIN */}
                {isAdmin && (
                  <button 
                    type="button" 
                    onClick={() => setVaultType('BRANKAS_BOSS')} 
                    style={{ 
                      padding: '8px', 
                      fontSize: '10px', 
                      backgroundColor: vaultType === 'BRANKAS_BOSS' ? '#f59e0b' : 'transparent', 
                      color: vaultType === 'BRANKAS_BOSS' ? '#000' : '#fff', 
                      border: '1px solid #f59e0b', 
                      fontWeight: 'bold' 
                    }}
                  >
                    👑 BRANKAS BOSS (ADMIN)
                  </button>
                )}
              </div>

              {!isAdmin && (
                <small style={{ fontSize: '10px', color: '#f59e0b', display: 'block', marginTop: '6px' }}>
                  ℹ️ Anda mengakses sebagai member di bawah Capo (Brankas Utama WT). Brankas Boss terkunci & disembunyikan.
                </small>
              )}
            </div>

            {/* Aksi */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>JENIS TRANSAKSI</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginTop: '6px' }}>
                <button type="button" onClick={() => setActionType('DEPOSIT')} style={{ padding: '6px', fontSize: '9px', backgroundColor: actionType === 'DEPOSIT' ? '#10b981' : 'transparent', color: actionType === 'DEPOSIT' ? '#000' : '#fff', border: '1px solid var(--hairline)', fontWeight: 'bold' }}>📥 DEPOSIT</button>
                <button type="button" onClick={() => setActionType('WITHDRAW')} style={{ padding: '6px', fontSize: '9px', backgroundColor: actionType === 'WITHDRAW' ? '#ef4444' : 'transparent', color: actionType === 'WITHDRAW' ? '#fff' : '#fff', border: '1px solid var(--hairline)', fontWeight: 'bold' }}>📤 AMBIL</button>
                <button type="button" onClick={() => setActionType('KEBUTUHAN')} style={{ padding: '6px', fontSize: '9px', backgroundColor: actionType === 'KEBUTUHAN' ? '#3b82f6' : 'transparent', color: actionType === 'KEBUTUHAN' ? '#fff' : '#fff', border: '1px solid var(--hairline)', fontWeight: 'bold' }}>📖 BUTUH</button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>NAMA BARANG / ITEM</label>
              <input type="text" placeholder="e.g. Bandage, Lockpick, Weapon..." value={itemName} onChange={e => setItemName(e.target.value)} required />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>JUMLAH (QTY)</label>
              <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} required />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>URL BUKTI SCREENSHOT {actionType !== 'KEBUTUHAN' && <span style={{ color: '#ef4444' }}>(WAJIB)</span>}</label>
              <input type="text" placeholder="Link screenshot..." value={proofUrl} onChange={e => setProofUrl(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>CATATAN (OPSIONAL)</label>
              <input type="text" placeholder="Keterangan tambahan..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <button type="submit" disabled={loading} style={{ backgroundColor: '#00f0ff', color: '#000', fontWeight: 'bold', padding: '10px' }}>
              {loading ? 'SAVING...' : `SIMPAN LOG ${vaultType.replace('_', ' ')} ↗`}
            </button>
          </form>
        </div>

        {/* Tabel Log Brankas */}
        <div style={{ padding: '24px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--hairline)', borderRadius: '4px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 16px 0', fontSize: '14px' }}>
            RIWAYAT LOG BRANKAS {isAdmin ? '(SEMUA BRANKAS)' : '(BRANKAS UTAMA WT)'}
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--hairline)', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '10px' }}>
                <th style={{ padding: '10px' }}>WAKTU</th>
                <th style={{ padding: '10px' }}>NAMA IC</th>
                <th style={{ padding: '10px' }}>BRANKAS</th>
                <th style={{ padding: '10px' }}>AKSI</th>
                <th style={{ padding: '10px' }}>ITEM</th>
                <th style={{ padding: '10px' }}>QTY</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>BUKTI</th>
              </tr>
            </thead>
            <tbody>
              {visibleLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '24px 10px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Belum ada data log brankas.
                  </td>
                </tr>
              ) : (
                visibleLogs.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(item.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td style={{ padding: '10px', color: '#00f0ff', fontWeight: 'bold' }}>{item.member_name}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '2px', fontWeight: 'bold', backgroundColor: item.vault_type === 'BRANKAS_BOSS' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(0, 240, 255, 0.1)', color: item.vault_type === 'BRANKAS_BOSS' ? '#f59e0b' : '#00f0ff' }}>
                        {item.vault_type}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '2px', fontWeight: 'bold', backgroundColor: item.action_type === 'DEPOSIT' ? 'rgba(16, 185, 129, 0.2)' : item.action_type === 'WITHDRAW' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: item.action_type === 'DEPOSIT' ? '#10b981' : item.action_type === 'WITHDRAW' ? '#ef4444' : '#3b82f6' }}>
                        {item.action_type}
                      </span>
                    </td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.item_name}</td>
                    <td style={{ padding: '10px', fontFamily: 'var(--font-display)' }}>x{item.quantity}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      {item.proof_url ? (
                        <a href={item.proof_url} target="_blank" rel="noreferrer" style={{ fontSize: '10px', border: '1px solid var(--hairline)', padding: '4px 8px', color: '#fff', textDecoration: 'none' }}>PROOF ↗</a>
                      ) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}