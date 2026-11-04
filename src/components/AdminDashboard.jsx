import { useState, useEffect } from 'react'
import { getAttendances, addAttendance, deleteAttendance } from '../services/attendanceService'
import { getAllProfiles, updateProfileRoleAndTitle, deleteProfile } from '../services/authService'

export default function AdminDashboard() {
  const [attendances, setAttendances] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('STATISTIK') // 'STATISTIK', 'ANGGOTA', 'LAPORAN'
  
  // Filter & Search State
  const [search, setSearch] = useState('')
  const [dutyFilter, setDutyFilter] = useState('ALL') // 'ALL', 'ON_DUTY', 'DUTY_TODAY', 'NO_DUTY_TODAY'
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Custom Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, dutyFilter, activeTab])

  const fetchData = async () => {
    setLoading(true)
    const [attData, profData] = await Promise.all([
      getAttendances(),
      getAllProfiles()
    ])
    setAttendances(attData)
    setProfiles(profData)
    setLoading(false)
  }

  // BATAS MAKSIMAL SHIFT SINGLE (8 JAM)
  const MAX_SHIFT_MS = 8 * 60 * 60 * 1000

  // 1. LOGIKA INTERVAL SHIFT & AFK/OVERDUE DETECTION
  const getShiftIntervals = (userRecords) => {
    const sorted = [...userRecords].sort((a, b) => 
      new Date(a.clock_in || a.created_at) - new Date(b.clock_in || b.created_at)
    )

    const shifts = []
    let activeStart = null

    sorted.forEach(r => {
      const t = new Date(r.clock_in || r.created_at).getTime()
      if (isNaN(t)) return

      if (r.type === 'BANGUN') {
        activeStart = t
      } else if (r.type === 'TIDUR' && activeStart) {
        if (t > activeStart) {
          // Cap durasi manual jika > 8 jam
          const duration = Math.min(t - activeStart, MAX_SHIFT_MS)
          shifts.push({ start: activeStart, end: activeStart + duration, isActive: false, isOverdue: false })
        }
        activeStart = null
      }
    })

    // JIKA MASIH STATUS BANGUN (BELUM TIDUR)
    if (activeStart) {
      const elapsed = Date.now() - activeStart
      const isOverdue = elapsed > MAX_SHIFT_MS // Lupa TIDUR lebih dari 8 jam

      const endTime = isOverdue ? activeStart + MAX_SHIFT_MS : Date.now()

      shifts.push({ 
        start: activeStart, 
        end: endTime, 
        isActive: !isOverdue, 
        isOverdue: isOverdue 
      })
    }

    return shifts
  }

  const calculateOverlapMs = (shifts, periodStartMs, periodEndMs) => {
    let totalMs = 0
    shifts.forEach(s => {
      const start = Math.max(s.start, periodStartMs)
      const end = Math.min(s.end, periodEndMs)
      if (end > start) {
        totalMs += (end - start)
      }
    })
    return totalMs
  }

  const formatMsToHours = (ms) => {
    if (!ms || ms <= 0) return '0j 0m'
    const totalMinutes = Math.floor(ms / (1000 * 60))
    const hours = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60
    return hours > 0 ? `${hours}j ${mins}m` : `${mins}m`
  }

  const nowMs = Date.now()
  const todayStartMs = new Date().setHours(0, 0, 0, 0)
  const weekStartMs = nowMs - (7 * 24 * 60 * 60 * 1000)
  const monthStartMs = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()

  // 2. SMART MATCHING (PROFILES + ATTENDANCES)
  const allMemberNamesMap = {}

  // 2a. Masukkan data profil terdaftar dari public.profiles
  profiles.forEach(p => {
    const key = p.id
    const displayName = p.ic_name || `Discord User (${p.id.substring(0, 6)}...)`
    allMemberNamesMap[key] = {
      discordId: p.id,
      name: displayName,
      role: p.role || 'WORKER',
      title: p.title || 'Anggota',
      records: []
    }
  })

  // 2b. Gabungkan log absensi
  attendances.forEach(item => {
    const name = (item.member_name || '').trim()
    if (!name) return

    let foundKey = Object.keys(allMemberNamesMap).find(
      k => allMemberNamesMap[k].name.toLowerCase() === name.toLowerCase()
    )

    if (!foundKey && profiles.length === 1) {
      foundKey = profiles[0].id
      allMemberNamesMap[foundKey].name = name
    }

    if (foundKey) {
      allMemberNamesMap[foundKey].records.push(item)
    } else {
      allMemberNamesMap[name.toLowerCase()] = {
        discordId: null,
        name: name,
        role: item.member_type || 'WORKER',
        title: 'Anggota',
        records: [item]
      }
    }
  })

  // Process data statistik
  const processedMembers = Object.values(allMemberNamesMap).map(m => {
    const shifts = getShiftIntervals(m.records)
    const isCurrentlyActive = shifts.some(s => s.isActive)
    const isOverdue = shifts.some(s => s.isOverdue)
    
    const hasDutyToday = m.records.some(r => {
      const d = new Date(r.clock_in || r.created_at)
      return d.toDateString() === new Date().toDateString()
    })

    const todayMs = calculateOverlapMs(shifts, todayStartMs, nowMs)
    const weekMs = calculateOverlapMs(shifts, weekStartMs, nowMs)
    const monthMs = calculateOverlapMs(shifts, monthStartMs, nowMs)
    const totalMs = calculateOverlapMs(shifts, 0, nowMs)

    return {
      ...m,
      isCurrentlyActive,
      isOverdue,
      hasDutyToday,
      todayMs,
      todayHours: formatMsToHours(todayMs),
      weekHours: formatMsToHours(weekMs),
      monthHours: formatMsToHours(monthMs),
      totalHours: formatMsToHours(totalMs)
    }
  })

  // Filter Search & Duty Status
  const filteredMembers = processedMembers.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
                          m.title.toLowerCase().includes(search.toLowerCase())

    if (!matchesSearch) return false

    if (dutyFilter === 'ON_DUTY') return m.isCurrentlyActive || m.isOverdue
    if (dutyFilter === 'DUTY_TODAY') return m.hasDutyToday
    if (dutyFilter === 'NO_DUTY_TODAY') return !m.hasDutyToday

    return true
  })

  // PAGINATION
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedMembers = filteredMembers.slice(startIndex, startIndex + itemsPerPage)

  // STATS AUDIT
  const countTotal = processedMembers.length
  const countOnDuty = processedMembers.filter(m => m.isCurrentlyActive || m.isOverdue).length
  const countDutyToday = processedMembers.filter(m => m.hasDutyToday).length
  const countNoDutyToday = processedMembers.filter(m => !m.hasDutyToday).length

  // ACTIONS
  const handleForceOffDuty = async (memberName) => {
    try {
      await addAttendance({
        member_name: memberName,
        member_type: 'WORKER',
        type: 'TIDUR',
        activity: 'Duty Off / Auto-Force Off by Admin',
        proof_url: ''
      })
      fetchData()
    } catch (err) {
      alert('Gagal force off duty.')
    }
  }

  const handleRoleChange = async (discordId, newRole, currentTitle) => {
    if (!discordId) return alert('Profil tidak terikat ke ID Discord.')
    await updateProfileRoleAndTitle(discordId, newRole, currentTitle)
    fetchData()
  }

  const handleTitleChange = async (discordId, currentRole, newTitle) => {
    if (!discordId) return alert('Profil tidak terikat ke ID Discord.')
    await updateProfileRoleAndTitle(discordId, currentRole, newTitle)
    fetchData()
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      if (deleteTarget.type === 'PROFILE') {
        await deleteProfile(deleteTarget.id)
      } else if (deleteTarget.type === 'ATTENDANCE') {
        await deleteAttendance(deleteTarget.id)
      }
      fetchData()
    } catch (err) {
      alert('Gagal menghapus data.')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleDownloadCSV = () => {
    if (attendances.length === 0) return alert('Belum ada data untuk diunduh!')

    const headers = ['ID Absen', 'Nama IC', 'Role', 'Status Duty', 'Aktivitas', 'Waktu', 'URL Bukti']
    const rows = attendances.map(item => [
      item.id,
      `"${item.member_name}"`,
      item.member_type || 'WORKER',
      item.type,
      `"${item.activity || '-'}"`,
      `"${new Date(item.clock_in || item.created_at || Date.now()).toLocaleString('id-ID')}"`,
      `"${item.proof_url || '-'}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `laporan-duty-wt-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', position: 'relative' }}>
      {/* Header & Main Nav Tabs */}
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', border: '1px solid var(--hairline)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', textTransform: 'uppercase', margin: 0, color: '#00f0ff' }}>
            ⚙️ PANEL KONTROL AUDIT ADMIN
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Sistem rekap cepat keaktifan & audit jam duty anggota White Tiger Jerman.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#161820', padding: '4px', borderRadius: '4px', border: '1px solid var(--hairline)' }}>
          <button
            onClick={() => setActiveTab('STATISTIK')}
            style={{
              backgroundColor: activeTab === 'STATISTIK' ? '#00f0ff' : 'transparent',
              color: activeTab === 'STATISTIK' ? '#000' : 'var(--text-muted)',
              border: 'none',
              padding: '8px 16px',
              fontSize: '11px',
              fontWeight: 'bold',
              fontFamily: 'var(--font-display)',
              borderRadius: '2px',
              cursor: 'pointer'
            }}
          >
            📊 REKAP STATISTIK
          </button>
          <button
            onClick={() => setActiveTab('ANGGOTA')}
            style={{
              backgroundColor: activeTab === 'ANGGOTA' ? '#00f0ff' : 'transparent',
              color: activeTab === 'ANGGOTA' ? '#000' : 'var(--text-muted)',
              border: 'none',
              padding: '8px 16px',
              fontSize: '11px',
              fontWeight: 'bold',
              fontFamily: 'var(--font-display)',
              borderRadius: '2px',
              cursor: 'pointer'
            }}
          >
            👥 KELOLA ANGGOTA ({profiles.length})
          </button>
          <button
            onClick={() => setActiveTab('LAPORAN')}
            style={{
              backgroundColor: activeTab === 'LAPORAN' ? '#00f0ff' : 'transparent',
              color: activeTab === 'LAPORAN' ? '#000' : 'var(--text-muted)',
              border: 'none',
              padding: '8px 16px',
              fontSize: '11px',
              fontWeight: 'bold',
              fontFamily: 'var(--font-display)',
              borderRadius: '2px',
              cursor: 'pointer'
            }}
          >
            📋 LOG ABSENSI RAW
          </button>
        </div>
      </div>

      {/* TOP AUDIT SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ padding: '20px', border: '1px solid var(--hairline)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'var(--font-display)' }}>TOTAL ANGGOTA</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', margin: '4px 0 0 0', color: '#fff' }}>{countTotal} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Orang</span></h2>
        </div>
        <div style={{ padding: '20px', border: '1px solid var(--hairline)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'var(--font-display)' }}>⚡ ON DUTY SEKARANG</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', margin: '4px 0 0 0', color: '#10b981' }}>{countOnDuty} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Orang</span></h2>
        </div>
        <div style={{ padding: '20px', border: '1px solid var(--hairline)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'var(--font-display)' }}>✅ SUDAH DUTY HARI INI</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', margin: '4px 0 0 0', color: '#00f0ff' }}>{countDutyToday} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Orang</span></h2>
        </div>
        <div style={{ padding: '20px', border: '1px solid #ef444455', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
          <span style={{ color: '#ef4444', fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 'bold' }}>🚨 BELUM DUTY HARI INI</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', margin: '4px 0 0 0', color: '#ef4444' }}>{countNoDutyToday} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Orang</span></h2>
        </div>
      </div>

      {/* TAB 1: REKAP STATISTIK ANGGOTA */}
      {activeTab === 'STATISTIK' && (
        <div style={{ border: '1px solid var(--hairline)', borderRadius: '4px', backgroundColor: 'var(--bg-card)', padding: '24px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '6px', backgroundColor: '#161820', padding: '4px', borderRadius: '4px', border: '1px solid var(--hairline)' }}>
              {[
                { id: 'ALL', label: `Semua (${countTotal})` },
                { id: 'ON_DUTY', label: `⚡ On Duty (${countOnDuty})` },
                { id: 'DUTY_TODAY', label: `✅ Duty Hari Ini (${countDutyToday})` },
                { id: 'NO_DUTY_TODAY', label: `🚨 Belum Duty (${countNoDutyToday})` }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setDutyFilter(f.id)}
                  style={{
                    backgroundColor: dutyFilter === f.id ? (f.id === 'NO_DUTY_TODAY' ? '#ef4444' : '#00f0ff') : 'transparent',
                    color: dutyFilter === f.id ? (f.id === 'NO_DUTY_TODAY' ? '#fff' : '#000') : 'var(--text-muted)',
                    border: 'none',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-display)',
                    borderRadius: '2px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ width: '260px' }}>
              <input 
                type="text" 
                placeholder="Cari Nama IC / Jabatan..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Memuat statistik data...</p>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--hairline)', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '11px' }}>
                    <th style={{ padding: '12px 8px' }}>NAMA IC</th>
                    <th style={{ padding: '12px 8px' }}>JABATAN</th>
                    <th style={{ padding: '12px 8px' }}>DUTY HARI INI?</th>
                    <th style={{ padding: '12px 8px' }}>STATUS KOTA</th>
                    <th style={{ padding: '12px 8px', color: '#10b981' }}>JAM HARI INI</th>
                    <th style={{ padding: '12px 8px', color: '#00f0ff' }}>7 HARI TERAKHIR</th>
                    <th style={{ padding: '12px 8px', color: '#f59e0b' }}>BULAN INI</th>
                    <th style={{ padding: '12px 8px' }}>TOTAL SEMUA</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMembers.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '24px 8px', color: 'var(--text-muted)', textAlign: 'center' }}>
                        Tidak ada anggota yang cocok dengan filter ini.
                      </td>
                    </tr>
                  ) : (
                    paginatedMembers.map((m, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#00f0ff' }}>{m.name}</td>
                        <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{m.title}</td>

                        <td style={{ padding: '12px 8px' }}>
                          {m.hasDutyToday ? (
                            <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '2px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>
                              ✅ SUDAH DUTY
                            </span>
                          ) : (
                            <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '2px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>
                              ❌ BELUM DUTY
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '12px 8px' }}>
                          {m.isOverdue ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '2px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)', fontWeight: 'bold' }}>
                                ⚠️ LUPA TIDUR (&gt;8j)
                              </span>
                              <button
                                onClick={() => handleForceOffDuty(m.name)}
                                style={{ fontSize: '9px', padding: '2px 6px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '2px', cursor: 'pointer', fontWeight: 'bold' }}
                              >
                                FORCE OFF
                              </button>
                            </div>
                          ) : m.isCurrentlyActive ? (
                            <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '2px', backgroundColor: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', border: '1px solid rgba(0, 240, 255, 0.3)', fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>
                              ● ON DUTY
                            </span>
                          ) : (
                            <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '2px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
                              ○ OFF
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#10b981', fontFamily: 'var(--font-display)' }}>{m.todayHours}</td>
                        <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#00f0ff', fontFamily: 'var(--font-display)' }}>{m.weekHours}</td>
                        <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#f59e0b', fontFamily: 'var(--font-display)' }}>{m.monthHours}</td>
                        <td style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>{m.totalHours}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--hairline)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredMembers.length)} dari total {filteredMembers.length} anggota
                </span>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid var(--hairline)',
                      color: currentPage === 1 ? 'var(--text-muted)' : '#fff',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ← Prev
                  </button>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-display)', color: '#00f0ff' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid var(--hairline)',
                      color: currentPage === totalPages ? 'var(--text-muted)' : '#fff',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: KELOLA ANGGOTA */}
      {activeTab === 'ANGGOTA' && (
        <div style={{ border: '1px solid var(--hairline)', borderRadius: '4px', backgroundColor: 'var(--bg-card)', padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', textTransform: 'uppercase', marginBottom: '16px' }}>
            DAFTAR PROFIL ANGGOTA (PUBLIC.PROFILES)
          </h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--hairline)', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '11px' }}>
                <th style={{ padding: '12px 8px' }}>DISCORD USER ID</th>
                <th style={{ padding: '12px 8px' }}>NAMA IC</th>
                <th style={{ padding: '12px 8px' }}>ROLE SISTEM</th>
                <th style={{ padding: '12px 8px' }}>TITLE / JABATAN FAKSI</th>
                <th style={{ padding: '12px 8px' }}>TERDAFTAR SEJAK</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#00f0ff', fontFamily: 'var(--font-display)' }}>
                    {p.id}
                  </td>
                  <td style={{ padding: '12px 8px', color: '#fff' }}>
                    {p.ic_name || '-'}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <select 
                      value={p.role || 'WORKER'} 
                      onChange={(e) => handleRoleChange(p.id, e.target.value, p.title)}
                      style={{
                        backgroundColor: '#161820',
                        color: p.role === 'ADMIN' ? '#00f0ff' : '#fff',
                        border: '1px solid var(--hairline)',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-display)'
                      }}
                    >
                      <option value="WORKER">WORKER</option>
                      <option value="MEMBER">MEMBER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <input 
                      type="text" 
                      defaultValue={p.title || ''} 
                      onBlur={(e) => handleTitleChange(p.id, p.role, e.target.value)}
                      placeholder="e.g. TIGER HEAD, MEMBER..."
                      style={{
                        padding: '6px 10px',
                        fontSize: '12px',
                        width: '200px'
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {p.created_at ? new Date(p.created_at).toLocaleString('id-ID', { dateStyle: 'medium' }) : '-'}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <button
                      onClick={() => setDeleteTarget({ type: 'PROFILE', id: p.id, label: `Profil Discord ID: ${p.id}` })}
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        padding: '4px 10px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontFamily: 'var(--font-display)',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: LOG ABSENSI RAW */}
      {activeTab === 'LAPORAN' && (
        <div style={{ border: '1px solid var(--hairline)', borderRadius: '4px', backgroundColor: 'var(--bg-card)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', textTransform: 'uppercase', margin: 0 }}>
              LOG ABSENSI LENGKAP
            </h3>
            <button 
              onClick={handleDownloadCSV}
              style={{
                backgroundColor: '#10b981',
                color: '#000',
                fontWeight: 'bold',
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                fontSize: '11px',
                fontFamily: 'var(--font-display)',
                cursor: 'pointer'
              }}
            >
              📥 DOWNLOAD EXCEL / CSV
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--hairline)', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '11px' }}>
                <th style={{ padding: '12px 8px' }}>NAMA IC</th>
                <th style={{ padding: '12px 8px' }}>ROLE</th>
                <th style={{ padding: '12px 8px' }}>STATUS DUTY</th>
                <th style={{ padding: '12px 8px' }}>AKTIVITAS</th>
                <th style={{ padding: '12px 8px' }}>WAKTU</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {attendances.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#00f0ff' }}>{item.member_name}</td>
                  <td style={{ padding: '12px 8px' }}>{item.member_type || 'WORKER'}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{
                      fontSize: '9px',
                      padding: '2px 6px',
                      borderRadius: '2px',
                      fontWeight: 'bold',
                      backgroundColor: item.type === 'BANGUN' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: item.type === 'BANGUN' ? '#10b981' : '#ef4444'
                    }}>
                      {item.type === 'BANGUN' ? '● BANGUN' : '○ TIDUR'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{item.activity}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '11px' }}>
                    {new Date(item.clock_in || item.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <button
                      onClick={() => setDeleteTarget({ type: 'ATTENDANCE', id: item.id, label: `Absensi IC: ${item.member_name}` })}
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        padding: '4px 10px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontFamily: 'var(--font-display)',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CUSTOM MODAL CONFIRMATION */}
      {deleteTarget && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#111319',
            border: '1px solid #ef4444',
            borderRadius: '6px',
            padding: '24px 32px',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ fontFamily: 'var(--font-display)', color: '#ef4444', margin: '0 0 12px 0', fontSize: '16px' }}>
              ⚠️ KONFIRMASI HAPUS DATA
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Apakah Anda yakin ingin menghapus <strong>{deleteTarget.label}</strong>? Tindakan ini tidak bisa dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid var(--hairline)',
                  color: 'var(--text-muted)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  backgroundColor: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 'bold',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                HAPUS SEKARANG ↗
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}