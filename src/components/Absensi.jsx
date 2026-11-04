import { useState, useEffect } from 'react'
import { getAttendances, addAttendance } from '../services/attendanceService'
import { getCurrentUser, getUserProfile, updateIcName } from '../services/authService'

export default function Absensi() {
  const [attendances, setAttendances] = useState([])
  const [user, setUser] = useState(null)
  const [memberName, setMemberName] = useState('')
  const [tempIcName, setTempIcName] = useState('')
  const [isEditingIc, setIsEditingIc] = useState(false)
  
  // Role terkunci otomatis dari profil database
  const [memberType, setMemberType] = useState('WORKER') 
  const [userTitle, setUserTitle] = useState('Anggota')
  const [dutyType, setDutyType] = useState('BANGUN')    
  const [proofUrl, setProofUrl] = useState('')
  const [filterType, setFilterType] = useState('ALL')   
  const [loading, setLoading] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)

  // Custom Toast State
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'error') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 4000)
  }

  useEffect(() => {
    loadData()
    fetchUserProfil()
  }, [])

  const loadData = async () => {
    const data = await getAttendances()
    setAttendances(data)
  }

  // Fetch Profil User & Auto-Lock Role berdasarkan Database Supabase
  const fetchUserProfil = async () => {
    const currUser = await getCurrentUser()
    if (currUser) {
      setUser(currUser)
      const savedIc = currUser.user_metadata?.ic_name
      if (savedIc) setMemberName(savedIc)

      // Ambil role asli dari public.profiles
      const discordId = currUser.user_metadata?.provider_id || currUser.user_metadata?.sub || currUser.id
      const profile = await getUserProfile(discordId)

      if (profile) {
        if (profile.title) setUserTitle(profile.title)

        // LOGIKA PENENTUAN ROLE OTOMATIS:
        const titleUpper = (profile.title || '').toUpperCase()
        const roleUpper = (profile.role || '').toUpperCase()

        if (titleUpper.includes('BABY')) {
          setMemberType('BABY TIGER')
        } else if (roleUpper === 'MEMBER' || roleUpper === 'ADMIN' || titleUpper.includes('TIGER')) {
          setMemberType('MEMBER')
        } else {
          setMemberType('WORKER')
        }
      }
    }
  }

  const handleSaveIcName = async (e) => {
    e.preventDefault()
    if (!tempIcName.trim()) {
      return showToast('Nama IC tidak boleh kosong!', 'error')
    }
    
    setSetupLoading(true)
    try {
      const updatedUser = await updateIcName(tempIcName.trim())
      setUser(updatedUser)
      setMemberName(tempIcName.trim())
      setIsEditingIc(false)
      showToast('Profil IC berhasil disimpan!', 'success')
      fetchUserProfil() // Refresh role
    } catch (err) {
      showToast('Gagal menyimpan Nama IC ke database.', 'error')
    } finally {
      setSetupLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!memberName) {
      return showToast('Nama IC belum diset di profil!', 'error')
    }

    // Validasi Screenshot saat BANGUN
    if (dutyType === 'BANGUN' && !proofUrl.trim()) {
      return showToast('Bukti screenshot WAJIB diisi saat BANGUN / Duty On!', 'error')
    }

    setLoading(true)
    try {
      let durationText = ''
      if (dutyType === 'TIDUR') {
        const lastBangun = attendances.find(
          a => a.member_name?.toLowerCase() === memberName.toLowerCase() && a.type === 'BANGUN'
        )
        if (lastBangun && (lastBangun.clock_in || lastBangun.created_at)) {
          const startTime = new Date(lastBangun.clock_in || lastBangun.created_at).getTime()
          const endTime = new Date().getTime()
          const diffMs = endTime - startTime
          if (diffMs > 0) {
            const totalMinutes = Math.floor(diffMs / (1000 * 60))
            const hours = Math.floor(totalMinutes / 60)
            const mins = totalMinutes % 60
            durationText = hours > 0 ? `${hours}j ${mins}m` : `${mins}m`
          }
        }
      }

      const durStr = durationText ? ` | Durasi: ${durationText}` : ''
      const activityText = `${dutyType === 'BANGUN' ? 'Duty On / Kota' : 'Duty Off / Tidur'}${durStr}`

      await addAttendance({
        member_name: memberName,
        member_type: memberType, // Otomatis terkirim sesuai role database
        type: dutyType,
        activity: activityText,
        proof_url: proofUrl.trim()
      })

      setProofUrl('')
      showToast(`Berhasil record ${memberType} (${dutyType})!`, 'success')
      loadData()
    } catch (err) {
      showToast('Gagal menyimpan record duty.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredAttendances = attendances.filter(item => {
    if (filterType === 'WORKER') return item.member_type === 'WORKER'
    if (filterType === 'MEMBER') return item.member_type === 'MEMBER'
    if (filterType === 'BABY TIGER') return item.member_type === 'BABY TIGER'
    return true
  })

  const workerCount = attendances.filter(a => a.member_type === 'WORKER' && a.type === 'BANGUN').length
  const memberCount = attendances.filter(a => a.member_type === 'MEMBER' && a.type === 'BANGUN').length
  const babyTigerCount = attendances.filter(a => a.member_type === 'BABY TIGER' && a.type === 'BANGUN').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', position: 'relative' }}>
      
      {/* CUSTOM TOAST NOTIFICATION */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 99999,
          backgroundColor: '#111319',
          border: `1px solid ${toast.type === 'error' ? '#ef4444' : '#10b981'}`,
          borderRadius: '4px',
          padding: '14px 20px',
          boxShadow: `0 8px 24px ${toast.type === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '16px' }}>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span style={{ color: toast.type === 'error' ? '#ef4444' : '#10b981', fontSize: '12px', fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>
            {toast.message}
          </span>
        </div>
      )}

      {/* Top Banner Stat Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ padding: '24px', border: '1px solid var(--hairline)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>[01] TOTAL RECORDS</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontVariationSettings: '"wdth" 110, "wght" 700', fontSize: '38px', margin: '8px 0 0 0', lineHeight: 1 }}>{attendances.length}+</h2>
        </div>

        <div style={{ padding: '24px', border: '1px solid var(--hairline)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>[02] ACTIVE WORKERS</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontVariationSettings: '"wdth" 110, "wght" 700', fontSize: '38px', margin: '8px 0 0 0', lineHeight: 1, color: '#10b981' }}>{workerCount}</h2>
        </div>

        <div style={{ padding: '24px', border: '1px solid var(--hairline)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>[03] ACTIVE MEMBERS</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontVariationSettings: '"wdth" 110, "wght" 700', fontSize: '38px', margin: '8px 0 0 0', lineHeight: 1, color: '#00f0ff' }}>{memberCount}</h2>
        </div>

        <div style={{ padding: '24px', border: '1px solid var(--hairline)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>[04] BABY TIGER</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontVariationSettings: '"wdth" 110, "wght" 700', fontSize: '38px', margin: '8px 0 0 0', lineHeight: 1, color: '#f59e0b' }}>{babyTigerCount}</h2>
        </div>
      </div>

      {/* Form & Feed Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '32px' }}>
        
        {/* PANEL KIRI: SETUP PROFIL ATAU FORM DUTY */}
        <div style={{ padding: '32px', border: '1px solid var(--hairline)', borderRadius: '4px', backgroundColor: 'var(--bg-card)', height: 'fit-content' }}>
          
          {(!memberName || isEditingIc) ? (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', textTransform: 'uppercase', color: '#00f0ff' }}>
                  ⚙️ SETUP PROFIL IC
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Set nama karakter IC FiveM lu sekali untuk terikat dengan akun Discord ini.
                </p>
              </div>

              <form onSubmit={handleSaveIcName} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
                    NAMA IC KARAKTER
                  </label>
                  <input 
                    type="text" 
                    placeholder="Masukkan Nama IC..." 
                    value={tempIcName} 
                    onChange={(e) => setTempIcName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" disabled={setupLoading} style={{ flex: 1, backgroundColor: '#00f0ff', color: '#000', fontWeight: 'bold' }}>
                    {setupLoading ? 'SAVING...' : 'SIMPAN PROFIL ↗'}
                  </button>
                  {isEditingIc && (
                    <button type="button" onClick={() => setIsEditingIc(false)} style={{ backgroundColor: 'transparent', border: '1px solid var(--hairline)' }}>
                      BATAL
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : (

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  RECORD DUTY STATUS
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>● INPUT</span>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* NAMA IC TERISI OTOMATIS */}
                <div style={{ padding: '12px', border: '1px dashed rgba(0, 240, 255, 0.3)', borderRadius: '4px', backgroundColor: 'rgba(0, 240, 255, 0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>NAMA IC TERVERIFIKASI</span>
                    <strong style={{ fontSize: '14px', color: '#00f0ff', fontFamily: 'var(--font-display)' }}>{memberName}</strong>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => { setTempIcName(memberName); setIsEditingIc(true); }}
                    style={{ fontSize: '10px', padding: '4px 8px', border: '1px solid var(--hairline)', backgroundColor: 'transparent', color: 'var(--text-muted)' }}
                  >
                    Edit
                  </button>
                </div>

                {/* ROLE FAKSI TERKUNCI OTOMATIS DARI PROFIL DATABASE */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
                    PERAN / ROLE FAKSI <span style={{ color: '#10b981' }}>(TERLOCK OTOMATIS)</span>
                  </label>
                  <div style={{ padding: '12px', backgroundColor: '#161820', borderRadius: '4px', border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
                      JABATAN: <span style={{ color: '#fff' }}>{userTitle}</span>
                    </span>
                    <strong style={{ 
                      fontSize: '11px', 
                      fontFamily: 'var(--font-display)', 
                      color: memberType === 'BABY TIGER' ? '#f59e0b' : (memberType === 'MEMBER' ? '#00f0ff' : '#10b981'),
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      padding: '4px 10px',
                      borderRadius: '2px',
                      border: '1px solid var(--hairline)'
                    }}>
                      🔒 {memberType}
                    </strong>
                  </div>
                </div>

                {/* Status Duty */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>STATUS DUTY</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#161820', padding: '4px', borderRadius: '4px', border: '1px solid var(--hairline)' }}>
                    <button type="button" onClick={() => setDutyType('BANGUN')} style={{ backgroundColor: dutyType === 'BANGUN' ? '#10b981' : 'transparent', color: dutyType === 'BANGUN' ? '#000' : 'var(--text-muted)', padding: '8px', fontSize: '10px', borderRadius: '2px', fontWeight: 'bold' }}>⚡ BANGUN</button>
                    <button type="button" onClick={() => setDutyType('TIDUR')} style={{ backgroundColor: dutyType === 'TIDUR' ? '#ef4444' : 'transparent', color: dutyType === 'TIDUR' ? '#fff' : 'var(--text-muted)', padding: '8px', fontSize: '10px', borderRadius: '2px', fontWeight: 'bold' }}>🌙 TIDUR</button>
                  </div>
                </div>

                {/* URL Bukti Screenshot */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
                    URL BUKTI SCREENSHOT {dutyType === 'BANGUN' ? <span style={{ color: '#ef4444' }}>(WAJIB)</span> : <span style={{ color: '#4e4f57' }}>(OPSIONAL)</span>}
                  </label>
                  <input 
                    type="text" 
                    placeholder={dutyType === 'BANGUN' ? "Masukkan link bukti screenshot..." : "Link bukti (opsional)..."} 
                    value={proofUrl} 
                    onChange={(e) => setProofUrl(e.target.value)} 
                  />
                </div>

                <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '8px' }}>
                  {loading ? 'SUBMITTING...' : `RECORD ${memberType} (${dutyType}) ↗`}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Stream Feed List */}
        <div style={{ padding: '32px', border: '1px solid var(--hairline)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>DUTY STREAM FEED</h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'WORKER', 'MEMBER', 'BABY TIGER'].map((type) => (
                <button 
                  key={type} 
                  onClick={() => setFilterType(type)} 
                  style={{ 
                    backgroundColor: filterType === type ? (type === 'BABY TIGER' ? '#f59e0b' : '#ffffff') : 'transparent', 
                    color: filterType === type ? '#000000' : 'var(--text-muted)', 
                    border: '1px solid var(--hairline)', 
                    padding: '4px 10px', 
                    fontSize: '10px', 
                    borderRadius: '4px',
                    fontWeight: filterType === type ? 'bold' : 'normal'
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredAttendances.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Belum ada data absensi tercatat.</p>
            ) : (
              filteredAttendances.map((item, idx) => (
                <div key={item.id} style={{ padding: '18px 24px', border: '1px solid var(--hairline)', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>#{String(filteredAttendances.length - idx).padStart(2, '0')}</span>
                      <strong style={{ fontSize: '15px', fontFamily: 'var(--font-display)', fontVariationSettings: '"wght" 600' }}>{item.member_name}</strong>
                      
                      <span style={{ 
                        fontSize: '9px', 
                        padding: '2px 6px', 
                        borderRadius: '2px', 
                        border: '1px solid var(--hairline)', 
                        color: item.member_type === 'BABY TIGER' ? '#f59e0b' : (item.member_type === 'MEMBER' ? '#00f0ff' : 'var(--text-secondary)'), 
                        fontFamily: 'var(--font-display)',
                        fontWeight: 'bold'
                      }}>
                        {item.member_type || 'WORKER'}
                      </span>

                      <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '2px', fontWeight: 'bold', fontFamily: 'var(--font-display)', backgroundColor: item.type === 'BANGUN' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: item.type === 'BANGUN' ? '#10b981' : '#ef4444', border: item.type === 'BANGUN' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)' }}>{item.type === 'BANGUN' ? '● BANGUN' : '○ TIDUR'}</span>
                    </div>
                    <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>{item.activity}</p>
                    <small style={{ color: '#4e4f57', fontSize: '11px', marginTop: '4px', display: 'block' }}>{new Date(item.clock_in || item.created_at || Date.now()).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</small>
                  </div>

                  {item.proof_url && (
                    <a href={item.proof_url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-main)', textDecoration: 'none', fontSize: '11px', fontFamily: 'var(--font-display)', letterSpacing: '0.05em', border: '1px solid var(--hairline)', padding: '8px 16px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>PROOF ↗</a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}