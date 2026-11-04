import { useState, useEffect } from 'react'
import { getAttendances, addAttendance } from '../services/attendanceService'

export default function Absensi() {
  const [attendances, setAttendances] = useState([])
  const [memberName, setMemberName] = useState('')
  const [memberType, setMemberType] = useState('WORKER') // 'WORKER' atau 'MEMBER'
  const [dutyType, setDutyType] = useState('BANGUN')    // 'BANGUN' atau 'TIDUR'
  const [activity, setActivity] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [filterType, setFilterType] = useState('ALL')   // 'ALL', 'WORKER', 'MEMBER'
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const data = await getAttendances()
    setAttendances(data)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!memberName) return alert('Nama wajib diisi!')

    setLoading(true)
    try {
      await addAttendance({
        member_name: memberName,
        member_type: memberType,
        type: dutyType,
        activity: activity || (dutyType === 'BANGUN' ? 'Duty On / Kota' : 'Duty Off / Tidur'),
        proof_url: proofUrl
      })
      setMemberName('')
      setActivity('')
      setProofUrl('')
      loadData()
    } catch (err) {
      alert('Gagal menyimpan record duty.')
    } finally {
      setLoading(false)
    }
  }

  const filteredAttendances = attendances.filter(item => {
    if (filterType === 'WORKER') return item.member_type === 'WORKER'
    if (filterType === 'MEMBER') return item.member_type === 'MEMBER'
    return true
  })

  const workerCount = attendances.filter(a => a.member_type === 'WORKER' && a.type === 'BANGUN').length
  const memberCount = attendances.filter(a => a.member_type === 'MEMBER' && a.type === 'BANGUN').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      {/* Top Banner Stat Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <div style={{
          padding: '28px',
          border: '1px solid var(--hairline)',
          borderRadius: '4px',
          backgroundColor: 'var(--bg-card)'
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
            [01] TOTAL RECORDS
          </span>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontVariationSettings: '"wdth" 110, "wght" 700',
            fontSize: '48px',
            margin: '8px 0 0 0',
            lineHeight: 1
          }}>
            {attendances.length}+
          </h2>
        </div>

        <div style={{
          padding: '28px',
          border: '1px solid var(--hairline)',
          borderRadius: '4px',
          backgroundColor: 'var(--bg-card)'
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
            [02] ACTIVE WORKERS
          </span>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontVariationSettings: '"wdth" 110, "wght" 700',
            fontSize: '48px',
            margin: '8px 0 0 0',
            lineHeight: 1,
            color: '#10b981'
          }}>
            {workerCount}
          </h2>
        </div>

        <div style={{
          padding: '28px',
          border: '1px solid var(--hairline)',
          borderRadius: '4px',
          backgroundColor: 'var(--bg-card)'
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
            [03] ACTIVE MEMBERS
          </span>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontVariationSettings: '"wdth" 110, "wght" 700',
            fontSize: '48px',
            margin: '8px 0 0 0',
            lineHeight: 1,
            color: '#00f0ff'
          }}>
            {memberCount}
          </h2>
        </div>
      </div>

      {/* Form & Feed Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '32px' }}>
        {/* Form Input Duty */}
        <div style={{
          padding: '32px',
          border: '1px solid var(--hairline)',
          borderRadius: '4px',
          backgroundColor: 'var(--bg-card)',
          height: 'fit-content'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontVariationSettings: '"wdth" 100, "wght" 600',
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}>
              RECORD DUTY STATUS
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>● INPUT</span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Tipe Anggota (Worker vs Member) */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>
                PERAN / ROLE
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#161820', padding: '4px', borderRadius: '4px', border: '1px solid var(--hairline)' }}>
                <button
                  type="button"
                  onClick={() => setMemberType('WORKER')}
                  style={{
                    backgroundColor: memberType === 'WORKER' ? '#fff' : 'transparent',
                    color: memberType === 'WORKER' ? '#000' : 'var(--text-muted)',
                    padding: '8px',
                    fontSize: '10px',
                    borderRadius: '2px'
                  }}
                >
                  WORKER
                </button>
                <button
                  type="button"
                  onClick={() => setMemberType('MEMBER')}
                  style={{
                    backgroundColor: memberType === 'MEMBER' ? '#fff' : 'transparent',
                    color: memberType === 'MEMBER' ? '#000' : 'var(--text-muted)',
                    padding: '8px',
                    fontSize: '10px',
                    borderRadius: '2px'
                  }}
                >
                  MEMBER
                </button>
              </div>
            </div>

            {/* Toggle Status Duty (Bangun vs Tidur) */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>
                STATUS DUTY
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#161820', padding: '4px', borderRadius: '4px', border: '1px solid var(--hairline)' }}>
                <button
                  type="button"
                  onClick={() => setDutyType('BANGUN')}
                  style={{
                    backgroundColor: dutyType === 'BANGUN' ? '#10b981' : 'transparent',
                    color: dutyType === 'BANGUN' ? '#000' : 'var(--text-muted)',
                    padding: '8px',
                    fontSize: '10px',
                    borderRadius: '2px'
                  }}
                >
                  ⚡ BANGUN
                </button>
                <button
                  type="button"
                  onClick={() => setDutyType('TIDUR')}
                  style={{
                    backgroundColor: dutyType === 'TIDUR' ? '#ef4444' : 'transparent',
                    color: dutyType === 'TIDUR' ? '#fff' : 'var(--text-muted)',
                    padding: '8px',
                    fontSize: '10px',
                    borderRadius: '2px'
                  }}
                >
                  🌙 TIDUR
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>
                NAMA IC
              </label>
              <input 
                type="text" 
                placeholder="misal: Willi" 
                value={memberName} 
                onChange={(e) => setMemberName(e.target.value)} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>
                CATATAN / AKTIVITAS
              </label>
              <input 
                type="text" 
                placeholder={dutyType === 'BANGUN' ? 'e.g. Duty On' : 'e.g. Off Duty'} 
                value={activity} 
                onChange={(e) => setActivity(e.target.value)} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>
                URL BUKTI SCREENSHOT
              </label>
              <input 
                type="text" 
                placeholder="https://cdn.discordapp.com/..." 
                value={proofUrl} 
                onChange={(e) => setProofUrl(e.target.value)} 
              />
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '8px' }}>
              {loading ? 'SUBMITTING...' : `RECORD ${memberType} (${dutyType}) ↗`}
            </button>
          </form>
        </div>

        {/* Stream Feed List */}
        <div style={{
          padding: '32px',
          border: '1px solid var(--hairline)',
          borderRadius: '4px',
          backgroundColor: 'var(--bg-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontVariationSettings: '"wdth" 100, "wght" 600',
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}>
              DUTY STREAM FEED
            </h3>

            {/* Filter Buttons */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'WORKER', 'MEMBER'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  style={{
                    backgroundColor: filterType === type ? '#ffffff' : 'transparent',
                    color: filterType === type ? '#000000' : 'var(--text-muted)',
                    border: '1px solid var(--hairline)',
                    padding: '4px 10px',
                    fontSize: '10px',
                    borderRadius: '4px'
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
                <div key={item.id} style={{
                  padding: '18px 24px',
                  border: '1px solid var(--hairline)',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
                        #{String(filteredAttendances.length - idx).padStart(2, '0')}
                      </span>
                      <strong style={{ fontSize: '15px', fontFamily: 'var(--font-display)', fontVariationSettings: '"wght" 600' }}>
                        {item.member_name}
                      </strong>
                      
                      {/* Badge Member Type */}
                      <span style={{
                        fontSize: '9px',
                        padding: '2px 6px',
                        borderRadius: '2px',
                        border: '1px solid var(--hairline)',
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-display)'
                      }}>
                        {item.member_type || 'WORKER'}
                      </span>

                      {/* Badge Status Bangun/Tidur */}
                      <span style={{
                        fontSize: '9px',
                        padding: '2px 6px',
                        borderRadius: '2px',
                        fontWeight: 'bold',
                        fontFamily: 'var(--font-display)',
                        backgroundColor: item.type === 'BANGUN' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: item.type === 'BANGUN' ? '#10b981' : '#ef4444',
                        border: item.type === 'BANGUN' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                      }}>
                        {item.type === 'BANGUN' ? '● BANGUN' : '○ TIDUR'}
                      </span>
                    </div>

                    <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                      {item.activity}
                    </p>
                    <small style={{ color: '#4e4f57', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      {new Date(item.clock_in).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </small>
                  </div>

                  {item.proof_url && (
                    <a 
                      href={item.proof_url} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{
                        color: 'var(--text-main)',
                        textDecoration: 'none',
                        fontSize: '11px',
                        fontFamily: 'var(--font-display)',
                        letterSpacing: '0.05em',
                        border: '1px solid var(--hairline)',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)'
                      }}
                    >
                      PROOF ↗
                    </a>
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