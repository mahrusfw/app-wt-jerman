import { useState, useEffect } from 'react'
import { getFinanceLogs, addFinanceLog } from '../services/vaultAndFinanceService'
import { getCurrentUser } from '../services/authService'

export default function BisnisModule() {
  const [logs, setLogs] = useState([])
  const [memberName, setMemberName] = useState('')
  const [type, setType] = useState('DEPOSIT') // DEPOSIT / WITHDRAW
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('LEGAL_BUSINESS')
  const [description, setDescription] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const data = await getFinanceLogs()
    setLogs(data)
    const currUser = await getCurrentUser()
    if (currUser?.user_metadata?.ic_name) {
      setMemberName(currUser.user_metadata.ic_name)
    }
  }

  // Hitung Totals
  const totalDeposit = logs.filter(l => l.type === 'DEPOSIT').reduce((acc, curr) => acc + Number(curr.amount), 0)
  const totalWithdraw = logs.filter(l => l.type === 'WITHDRAW').reduce((acc, curr) => acc + Number(curr.amount), 0)
  const saldoKas = totalDeposit - totalWithdraw

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!memberName) return alert('Nama IC belum diset di profil!')
    if (!amount || Number(amount) <= 0) return alert('Nominal harus lebih dari 0!')
    if (!proofUrl.trim()) return alert('Bukti screenshot transaksi wajib diisi!')

    setLoading(true)
    try {
      await addFinanceLog({
        member_name: memberName,
        type,
        amount: Number(amount),
        category,
        description: description.trim(),
        proof_url: proofUrl.trim()
      })
      setAmount('')
      setDescription('')
      setProofUrl('')
      fetchData()
    } catch (err) {
      alert('Gagal mencatat transaksi keuangan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Cards Summary Kas Faksi */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div style={{ padding: '20px', border: '1px solid var(--hairline)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'var(--font-display)' }}>TOTAL MASUK (DEPOSIT)</span>
          <h2 style={{ fontFamily: 'var(--font-display)', color: '#10b981', margin: '4px 0 0 0' }}>
            ${totalDeposit.toLocaleString('id-ID')}
          </h2>
        </div>
        <div style={{ padding: '20px', border: '1px solid var(--hairline)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'var(--font-display)' }}>TOTAL KELUAR (WITHDRAW)</span>
          <h2 style={{ fontFamily: 'var(--font-display)', color: '#ef4444', margin: '4px 0 0 0' }}>
            ${totalWithdraw.toLocaleString('id-ID')}
          </h2>
        </div>
        <div style={{ padding: '20px', border: '1px solid var(--hairline)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'var(--font-display)' }}>SALDO KAS SAAT INI</span>
          <h2 style={{ fontFamily: 'var(--font-display)', color: '#00f0ff', margin: '4px 0 0 0' }}>
            ${saldoKas.toLocaleString('id-ID')}
          </h2>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '28px' }}>
        {/* Form Transaksi Uang */}
        <div style={{ padding: '24px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--hairline)', borderRadius: '4px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: '#10b981', margin: '0 0 16px 0', fontSize: '14px' }}>
            💸 TRANSAKSI KEUANGAN
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>TIPE TRANSAKSI</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
                <button type="button" onClick={() => setType('DEPOSIT')} style={{ padding: '8px', fontSize: '10px', backgroundColor: type === 'DEPOSIT' ? '#10b981' : 'transparent', color: type === 'DEPOSIT' ? '#000' : '#fff', border: '1px solid var(--hairline)', fontWeight: 'bold' }}>📥 DEPOSIT</button>
                <button type="button" onClick={() => setType('WITHDRAW')} style={{ padding: '8px', fontSize: '10px', backgroundColor: type === 'WITHDRAW' ? '#ef4444' : 'transparent', color: type === 'WITHDRAW' ? '#fff' : '#fff', border: '1px solid var(--hairline)', fontWeight: 'bold' }}>📤 WITHDRAW</button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>NOMINAL ($)</label>
              <input type="number" placeholder="e.g. 50000" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>KATEGORI BISNIS</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#161820', color: '#fff', border: '1px solid var(--hairline)', borderRadius: '4px' }}>
                <option value="LEGAL_BUSINESS">HASIL BISNIS LEGAL</option>
                <option value="CRAFTING">CRAFTING & MATERIAL</option>
                <option value="OPERATIONAL">OPERASIONAL FAKSI</option>
                <option value="BONUS">BONUS / GAJI ANGGOTA</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>DESKRIPSI TRANSAKSI</label>
              <input type="text" placeholder="e.g. Setoran bisnis toko / Beli material..." value={description} onChange={e => setDescription(e.target.value)} required />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>URL BUKTI <span style={{ color: '#ef4444' }}>(WAJIB)</span></label>
              <input type="text" placeholder="Link bukti transfer/screenshot..." value={proofUrl} onChange={e => setProofUrl(e.target.value)} required />
            </div>

            <button type="submit" disabled={loading} style={{ backgroundColor: '#10b981', color: '#000', fontWeight: 'bold', padding: '10px' }}>
              {loading ? 'SUBMITTING...' : 'CATAT TRANSAKSI KEUANGAN ↗'}
            </button>
          </form>
        </div>

        {/* Tabel Catatan Keuangan */}
        <div style={{ padding: '24px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--hairline)', borderRadius: '4px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 16px 0', fontSize: '14px' }}>
            CATATAN KEUANGAN KAS FAKSI
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--hairline)', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '10px' }}>
                <th style={{ padding: '10px' }}>WAKTU</th>
                <th style={{ padding: '10px' }}>NAMA IC</th>
                <th style={{ padding: '10px' }}>TIPE</th>
                <th style={{ padding: '10px' }}>NOMINAL</th>
                <th style={{ padding: '10px' }}>KETERANGAN</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>BUKTI</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(item.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td style={{ padding: '10px', color: '#00f0ff', fontWeight: 'bold' }}>{item.member_name}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '2px', fontWeight: 'bold', backgroundColor: item.type === 'DEPOSIT' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: item.type === 'DEPOSIT' ? '#10b981' : '#ef4444' }}>
                      {item.type}
                    </span>
                  </td>
                  <td style={{ padding: '10px', fontWeight: 'bold', fontFamily: 'var(--font-display)', color: item.type === 'DEPOSIT' ? '#10b981' : '#ef4444' }}>
                    ${Number(item.amount).toLocaleString('id-ID')}
                  </td>
                  <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{item.description}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    {item.proof_url ? (
                      <a href={item.proof_url} target="_blank" rel="noreferrer" style={{ fontSize: '10px', border: '1px solid var(--hairline)', padding: '4px 8px', color: '#fff', textDecoration: 'none' }}>PROOF ↗</a>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}