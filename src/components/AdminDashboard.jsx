import { useState, useEffect } from 'react'
import { supabase } from '../config/supabaseClient'

export default function AdminDashboard() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [newId, setNewId] = useState('')
  const [newRole, setNewRole] = useState('MEMBER')
  const [newTitle, setNewTitle] = useState('ORDINARY MEMBER')

  const fetchProfiles = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('role', { ascending: false })

    if (error) {
      console.error('Gagal mengambil data profiles:', error.message)
    } else {
      setProfiles(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProfiles()
  }, [])

  const handleAddMember = async (e) => {
    e.preventDefault()
    if (!newId) return alert('Masukkan ID Discord terlebih dahulu!')

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: newId, role: newRole, title: newTitle })

    if (error) {
      alert('Gagal menyimpan: ' + error.message)
    } else {
      alert('Berhasil menyimpan data member!')
      setNewId('')
      setNewTitle('ORDINARY MEMBER')
      fetchProfiles()
    }
  }

  const handleUpdate = async (id, updatedField, value) => {
    const { error } = await supabase
      .from('profiles')
      .update({ [updatedField]: value })
      .eq('id', id)

    if (error) {
      alert('Gagal update: ' + error.message)
    } else {
      fetchProfiles()
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin mau hapus akses member ini dari faksi?')) return

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Gagal menghapus: ' + error.message)
    } else {
      fetchProfiles()
    }
  }

  return (
    <div style={{ color: '#fff' }}>
      <h2>⚙️ Faction Backend Admin Panel</h2>
      <p style={{ color: '#9ca3af', marginBottom: '20px' }}>Kelola akses, role, dan title anggota faksi White Tiger Jerman langsung dari sini.</p>

      {/* Form Tambah Member */}
      <form onSubmit={handleAddMember} style={{ background: '#1e1e1e', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', border: '1px solid rgba(255,255,255,0.08)' }}>
        <input 
          type="text" 
          placeholder="Discord ID (Contoh: 6926...)" 
          value={newId} 
          onChange={(e) => setNewId(e.target.value)}
          style={{ padding: '8px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '4px', flex: 1 }}
        />
        <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{ padding: '8px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}>
          <option value="ADMIN">ADMIN</option>
          <option value="WORKER">WORKER</option>
          <option value="MEMBER">MEMBER</option>
          <option value="BABY">BABY</option>
        </select>
        <input 
          type="text" 
          placeholder="Title (Misal: CAPO / NABI)" 
          value={newTitle} 
          onChange={(e) => setNewTitle(e.target.value.toUpperCase())}
          style={{ padding: '8px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
        />
        <button type="submit" style={{ padding: '8px 15px', background: '#e50914', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Tambah Anggota
        </button>
      </form>

      {/* Tabel Daftar Member */}
      {loading ? (
        <p style={{ color: '#9ca3af' }}>Memuat data database...</p>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1e1e1e' }}>
            <thead>
              <tr style={{ background: '#2a2a2a', textAlign: 'left', borderBottom: '1px solid #333' }}>
                <th style={{ padding: '12px' }}>Discord ID</th>
                <th style={{ padding: '12px' }}>Role Kategori</th>
                <th style={{ padding: '12px' }}>Title Faksi</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace' }}>{p.id}</td>
                  <td style={{ padding: '12px' }}>
                    <select 
                      value={p.role} 
                      onChange={(e) => handleUpdate(p.id, 'role', e.target.value)}
                      style={{ padding: '5px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="WORKER">WORKER</option>
                      <option value="MEMBER">MEMBER</option>
                      <option value="BABY">BABY</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <input 
                      type="text" 
                      defaultValue={p.title} 
                      onBlur={(e) => handleUpdate(p.id, 'title', e.target.value.toUpperCase())}
                      style={{ padding: '5px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '4px', width: '100%' }}
                    />
                    <span style={{ fontSize: '10px', color: '#888', display: 'block', marginTop: '2px' }}>*Klik luar kotak untuk menyimpan perubahan</span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button 
                      onClick={() => handleDelete(p.id)}
                      style={{ padding: '5px 10px', background: '#ff4d4d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}