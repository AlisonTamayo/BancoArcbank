import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMovimientos } from '../services/bancaApi'

export default function Movimientos() {
  const { state, refreshAccounts } = useAuth()
  const [selectedAccId, setSelectedAccId] = useState('')
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (state.user.accounts?.length > 0 && !selectedAccId) {
      setSelectedAccId(state.user.accounts[0].id)
    }
  }, [state.user.accounts, selectedAccId])

  useEffect(() => {
    if (selectedAccId) load()
  }, [selectedAccId])

  const load = async () => {
    setLoading(true)
    try {
      await refreshAccounts()
      const resp = await getMovimientos(selectedAccId)
      const list = Array.isArray(resp) ? resp : []
      const mapped = list.map(m => ({
        id: m.idTransaccion,
        date: new Date(m.fechaCreacion),
        desc: m.descripcion || 'Servicio General',
        type: m.tipoOperacion,
        amount: m.monto,
        balance: m.saldoResultante,
        isDebit: ['RETIRO', 'TRANSFERENCIA_SALIDA', 'TRANSFERENCIA_INTERNA'].includes(m.tipoOperacion)
          && String(m.idCuentaOrigen) === String(selectedAccId)
      })).sort((a, b) => b.date - a.date)
      setTxs(mapped)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="main-content fade-in">
      <header style={styles.header}>
        <div>
          <h2 style={{ fontSize: '12px', letterSpacing: '4px', color: 'var(--gold-primary)', marginBottom: '10px' }}>REGISTRO HISTÓRICO</h2>
          <h1 className="title-xl">Libro Mayor</h1>
        </div>

        <div style={styles.filterBox}>
          <label style={styles.filterLabel}>SELECCIONAR INSTRUMENTO</label>
          <select
            value={selectedAccId}
            onChange={e => setSelectedAccId(e.target.value)}
            style={styles.select}
          >
            {state.user.accounts.map(a => (
              <option key={a.id} value={a.id}>{a.number} — {a.type}</option>
            ))}
          </select>
        </div>
      </header>

      <div style={styles.summaryGrid}>
        <div className="premium-card" style={styles.summaryCard}>
          <div style={styles.sumLabel}>LIQUIDEZ ACTUAL</div>
          <div style={styles.sumVal}>
            ${state.user.accounts.find(a => String(a.id) === String(selectedAccId))?.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="premium-card" style={styles.summaryCard}>
          <div style={styles.sumLabel}>OPERACIONES TOTALES</div>
          <div style={styles.sumVal}>{txs.length}</div>
        </div>
      </div>

      <div className="premium-card" style={{ padding: 0, marginTop: '40px' }}>
        <table className="luxury-table">
          <thead>
            <tr>
              <th>CRONOLOGÍA</th>
              <th>CONCEPTO</th>
              <th>MODALIDAD</th>
              <th style={{ textAlign: 'right' }}>VALOR</th>
              <th style={{ textAlign: 'right' }}>RESERVA FINAL</th>
            </tr>
          </thead>
          <tbody>
            {txs.map(tx => (
              <tr key={tx.id}>
                <td style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
                  {tx.date.toLocaleDateString()} <br />
                  <span style={{ fontSize: '10px' }}>{tx.date.toLocaleTimeString()}</span>
                </td>
                <td style={{ fontWeight: '600', letterSpacing: '0.5px' }}>{tx.desc}</td>
                <td>
                  <span style={{
                    color: tx.isDebit ? 'var(--error-glow)' : 'var(--success-glow)',
                    fontSize: '10px',
                    fontWeight: '800',
                    border: `1px solid ${tx.isDebit ? 'var(--error-glow)' : 'var(--success-glow)'}`,
                    padding: '4px 8px',
                    borderRadius: '2px'
                  }}>
                    {tx.type}
                  </span>
                </td>
                <td style={{
                  textAlign: 'right',
                  fontWeight: '900',
                  fontSize: '18px',
                  color: tx.isDebit ? 'var(--error-glow)' : 'var(--success-glow)'
                }}>
                  {tx.isDebit ? '-' : '+'}${tx.amount.toFixed(2)}
                </td>
                <td style={{ textAlign: 'right', fontWeight: '800', fontFamily: 'monospace' }}>
                  ${(tx.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {txs.length === 0 && !loading && (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
            SIN ACTIVIDAD REGISTRADA EN ESTE INSTRUMENTO.
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '60px',
  },
  filterBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '10px',
  },
  filterLabel: {
    fontSize: '9px',
    letterSpacing: '2px',
    color: 'rgba(255,255,255,0.4)',
  },
  select: {
    background: '#000',
    color: 'var(--gold-primary)',
    border: '1px solid var(--gold-primary)',
    padding: '12px 20px',
    fontSize: '12px',
    fontWeight: '800',
    letterSpacing: '1px',
    outline: 'none',
    cursor: 'pointer',
    borderRadius: '4px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  },
  summaryCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '30px 40px',
  },
  sumLabel: {
    fontSize: '11px',
    letterSpacing: '2px',
    color: 'var(--text-dim)',
  },
  sumVal: {
    fontSize: '28px',
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'monospace',
  }
}