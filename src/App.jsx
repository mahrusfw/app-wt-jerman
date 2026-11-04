import { useState, useEffect } from 'react'
import { supabase } from './config/supabaseClient'
import { loginWithDiscord, logout } from './services/authService'
import { fetchUserDiscordRole } from './services/discordRoleService'
import Absensi from './components/Absensi'
import AdminDashboard from './components/AdminDashboard' // Import komponen yang dipisah

export default function App() {
  const [activeTab, setActiveTab] = useState('absen')
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState('GUEST')
  const [userTitle, setUserTitle] = useState('GUEST')
  const [loadingRole, setLoadingRole] = useState(false)
  const [roleError, setRoleError] = useState('')

  useEffect(() => {
    const handleSession = async (session) => {
      if (session) {
        setUser(session.user)
        setLoadingRole(true)
        setRoleError('')
        try {
          const result = await fetchUserDiscordRole(session.user)
          setUserRole(result.role)
          setUserTitle(result.title)
        } catch (error) {
          console.error('Gagal memverifikasi role Discord:', error)
          setUserRole('ERROR')
          setUserTitle('ERROR')
          setRoleError(error instanceof Error ? error.message : 'Unknown verification error')
        } finally {
          setLoadingRole(false)
        }
      } else {
        setUser(null)
        setUserRole('GUEST')
        setUserTitle('GUEST')
        setRoleError('')
        setLoadingRole(false)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const avatarUrl = user?.user_metadata?.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png'
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.custom_claims?.global_name || user?.email || 'User'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090a0f', color: '#f3f4f6' }}>
      {/* Top Bar Status */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 40px',
        fontSize: '11px',
        display: 'flex',
        justifyContent: 'space-between',
        textTransform: 'uppercase',
        letterSpacing: '0.08em'
      }}>
        <span>● FACTION SYSTEM / EST. 2026</span>
        <span>STATUS: {loadingRole ? 'VERIFYING...' : `${userRole} / ${userTitle}`}</span>
        <span>LIVE IN DETAILS</span>
      </div>

      {/* Header Bar */}
      <header style={{
        padding: '24px 40px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#121318'
      }}>
        <div style={{
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '10px 20px',
          borderRadius: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '10px', color: '#9ca3af' }}>[01]</span>
          <h1 style={{ fontSize: '20px', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.04em' }}>
            WHITE TIGER <span style={{ color: '#9ca3af', fontWeight: '300' }}>GERMAN</span>
          </h1>
        </div>

        {/* Tab Navigasi */}
        <nav style={{
          backgroundColor: '#0d0e12',
          padding: '4px',
          borderRadius: '30px',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          gap: '4px'
        }}>
          <button
            onClick={() => setActiveTab('absen')}
            style={{
              backgroundColor: activeTab === 'absen' ? '#ffffff' : 'transparent',
              color: activeTab === 'absen' ? '#000000' : '#9ca3af',
              border: 'none',
              borderRadius: '20px',
              padding: '8px 20px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Studio / Absensi
          </button>
          
          <button
            onClick={() => setActiveTab('pricelist')}
            style={{
              backgroundColor: activeTab === 'pricelist' ? '#ffffff' : 'transparent',
              color: activeTab === 'pricelist' ? '#000000' : '#9ca3af',
              border: 'none',
              borderRadius: '20px',
              padding: '8px 20px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Pricelist Senjata
          </button>

          {(userRole === 'ADMIN' || userRole === 'MEMBER' || userRole === 'WORKER') && (
            <button
              onClick={() => setActiveTab('brankas')}
              style={{
                backgroundColor: activeTab === 'brankas' ? '#ffffff' : 'transparent',
                color: activeTab === 'brankas' ? '#000000' : '#9ca3af',
                border: 'none',
                borderRadius: '20px',
                padding: '8px 20px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Vault Logs
            </button>
          )}

          {userRole === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('backend')}
              style={{
                backgroundColor: activeTab === 'backend' ? '#ef4444' : 'transparent',
                color: activeTab === 'backend' ? '#ffffff' : '#ef4444',
                border: 'none',
                borderRadius: '20px',
                padding: '8px 20px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ⚙️ Backend Admin
            </button>
          )}
        </nav>

        {/* User Auth Profile State */}
        <div>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img 
                src={avatarUrl} 
                alt="Avatar" 
                style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <div style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '3px' }}>
                  {displayName}
                </span>
                
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ 
                    fontSize: '9px', 
                    padding: '2px 6px', 
                    borderRadius: '2px',
                    backgroundColor: userRole === 'ADMIN' ? '#ef4444' : userRole === 'WORKER' ? '#10b981' : '#3b82f6',
                    color: '#fff',
                    fontWeight: 'bold',
                    letterSpacing: '0.05em'
                  }}>
                    {userRole}
                  </span>

                  <span style={{ 
                    fontSize: '9px', 
                    padding: '2px 6px', 
                    borderRadius: '2px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#f3f4f6',
                    fontWeight: 'bold',
                    letterSpacing: '0.05em'
                  }}>
                    {userTitle}
                  </span>
                </div>

              </div>
              <button 
                onClick={logout}
                style={{
                  backgroundColor: 'transparent',
                  color: '#9ca3af',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '6px 12px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  marginLeft: '8px'
                }}
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <button 
              onClick={loginWithDiscord}
              style={{
                backgroundColor: '#5865F2',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              CONNECT DISCORD ↗
            </button>
          )}
        </div>
      </header>

      {/* Container Utama */}
      <main style={{ padding: '48px 40px', maxWidth: '1360px', margin: '0 auto' }}>
        {loadingRole ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: '#9ca3af' }}>
            <h2>[ VERIFYING DISCORD ACCESS ]</h2>
            <p>Memeriksa keanggotaan server dan role Discord...</p>
          </div>
        ) : roleError || userRole === 'ERROR' ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: '#ef4444' }}>
            <h2>[ ROLE VERIFICATION FAILED ]</h2>
            <p style={{ color: '#9ca3af', marginTop: '8px' }}>
              Gagal memeriksa role Discord. Coba muat ulang halaman.
            </p>
          </div>
        ) : !user || userRole === 'OUTSIDER' ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: '#ef4444' }}>
            <h2>[ ACCESS DENIED ]</h2>
            <p style={{ color: '#9ca3af', marginTop: '8px' }}>
              {!user
                ? 'Hubungkan akun Discord untuk memeriksa akses.'
                : 'Akun Discord lu tidak ada di server White Tiger Jerman atau belum punya role akses.'}
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'absen' && <Absensi user={user} userRole={userRole} userTitle={userTitle} />}
            {activeTab === 'pricelist' && (
              <div style={{ padding: '60px 0', color: '#9ca3af' }}>
                // PRICELIST MODULE IN DEVELOPMENT
              </div>
            )}
            {activeTab === 'brankas' && (
              <div style={{ padding: '60px 0', color: '#9ca3af' }}>
                // VAULT LOGS MODULE IN DEVELOPMENT
              </div>
            )}
            {activeTab === 'backend' && userRole === 'ADMIN' && (
              <AdminDashboard />
            )}
          </>
        )}
      </main>
    </div>
  )
}