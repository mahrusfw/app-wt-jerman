import { useState, useEffect } from 'react'
import Absensi from './components/Absensi'
import AdminDashboard from './components/AdminDashboard'
import BrankasModule from './components/BrankasModule'
import BisnisModule from './components/BisnisModule'
import { getCurrentUser, getUserProfile, loginWithDiscord, logout } from './services/authService'

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('ABSENSI') // 'ABSENSI', 'BRANKAS', 'BISNIS', 'ADMIN'
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    setLoading(true)
    const currUser = await getCurrentUser()
    if (currUser) {
      setUser(currUser)
      const discordId = currUser.user_metadata?.provider_id || currUser.user_metadata?.sub || currUser.id
      const prof = await getUserProfile(discordId)
      setProfile(prof)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0a0b0e', color: '#00f0ff', fontFamily: 'var(--font-display)' }}>
        MEMUAT SISTEM WHITE TIGER...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0b0e', color: '#fff', padding: '24px 40px' }}>
      
      {/* NAVBAR MAIN HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', marginBottom: '32px', borderBottom: '1px solid var(--hairline)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', letterSpacing: '0.1em', color: '#00f0ff', margin: 0 }}>
            🐯 WHITE TIGER SYSTEM
          </h1>
          <span style={{ fontSize: '10px', padding: '2px 8px', border: '1px solid var(--hairline)', borderRadius: '2px', color: 'var(--text-muted)' }}>
            v2.4 PROD
          </span>
        </div>

        {/* NAVIGATION TABS */}
        {user && (
          <nav style={{ display: 'flex', gap: '8px', backgroundColor: '#161820', padding: '4px', borderRadius: '4px', border: '1px solid var(--hairline)' }}>
            <button
              onClick={() => setActiveTab('ABSENSI')}
              style={{
                backgroundColor: activeTab === 'ABSENSI' ? '#00f0ff' : 'transparent',
                color: activeTab === 'ABSENSI' ? '#000' : 'var(--text-muted)',
                border: 'none',
                padding: '8px 16px',
                fontSize: '11px',
                fontWeight: 'bold',
                fontFamily: 'var(--font-display)',
                borderRadius: '2px',
                cursor: 'pointer'
              }}
            >
              ⚡ ABSENSI DUTY
            </button>

            <button
              onClick={() => setActiveTab('BRANKAS')}
              style={{
                backgroundColor: activeTab === 'BRANKAS' ? '#00f0ff' : 'transparent',
                color: activeTab === 'BRANKAS' ? '#000' : 'var(--text-muted)',
                border: 'none',
                padding: '8px 16px',
                fontSize: '11px',
                fontWeight: 'bold',
                fontFamily: 'var(--font-display)',
                borderRadius: '2px',
                cursor: 'pointer'
              }}
            >
              📦 BRANKAS BARANG
            </button>

            <button
              onClick={() => setActiveTab('BISNIS')}
              style={{
                backgroundColor: activeTab === 'BISNIS' ? '#00f0ff' : 'transparent',
                color: activeTab === 'BISNIS' ? '#000' : 'var(--text-muted)',
                border: 'none',
                padding: '8px 16px',
                fontSize: '11px',
                fontWeight: 'bold',
                fontFamily: 'var(--font-display)',
                borderRadius: '2px',
                cursor: 'pointer'
              }}
            >
              💸 KEUANGAN BISNIS
            </button>

            {/* TAB ADMIN KHUSUS ROLE ADMIN */}
            {profile?.role === 'ADMIN' && (
              <button
                onClick={() => setActiveTab('ADMIN')}
                style={{
                  backgroundColor: activeTab === 'ADMIN' ? '#ef4444' : 'transparent',
                  color: activeTab === 'ADMIN' ? '#fff' : '#ef4444',
                  border: 'none',
                  padding: '8px 16px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  fontFamily: 'var(--font-display)',
                  borderRadius: '2px',
                  cursor: 'pointer'
                }}
              >
                ⚙️ ADMIN PANEL
              </button>
            )}
          </nav>
        )}

        {/* USER PROFILE / LOGIN */}
        <div>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#00f0ff' }}>
                  {user.user_metadata?.ic_name || user.user_metadata?.full_name}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {profile?.title || 'Anggota'}
                </span>
              </div>
              <button
                onClick={logout}
                style={{ backgroundColor: 'transparent', border: '1px solid var(--hairline)', color: '#ef4444', padding: '6px 12px', fontSize: '10px', borderRadius: '4px', cursor: 'pointer' }}
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <button
              onClick={loginWithDiscord}
              style={{ backgroundColor: '#5865F2', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              LOGIN DISCORD ↗
            </button>
          )}
        </div>
      </header>

      {/* RENDER MODUL AKTIF */}
      <main>
        {!user ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', border: '1px dashed var(--hairline)', borderRadius: '4px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: '#00f0ff' }}>AKSES TERBATAS</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Silakan login menggunakan akun Discord faksi untuk mengakses sistem.</p>
          </div>
        ) : (
          <>
            {activeTab === 'ABSENSI' && <Absensi />}
            {activeTab === 'BRANKAS' && <BrankasModule />}
            {activeTab === 'BISNIS' && <BisnisModule />}
            {activeTab === 'ADMIN' && profile?.role === 'ADMIN' && <AdminDashboard />}
          </>
        )}
      </main>
    </div>
  )
}