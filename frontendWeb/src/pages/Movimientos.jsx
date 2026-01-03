import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMovimientos } from '../services/bancaApi'

export default function Movimientos() {
  const { state, refreshAccounts } = useAuth()
  const [selectedAccId, setSelectedAccId] = useState('')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (state.user.accounts?.length > 0 && !selectedAccId) {
      setSelectedAccId(state.user.accounts[0].id)
    }
  }, [state.user.accounts, selectedAccId])

  useEffect(() => {
    if (selectedAccId) loadMovements()
  }, [selectedAccId])

  const loadMovements = async () => {
    if (!selectedAccId) return
    setLoading(true)
    try {
      await refreshAccounts()
      const resp = await getMovimientos(selectedAccId)
      const listaRaw = Array.isArray(resp) ? resp : []
      const mapped = listaRaw.map((m, i) => {
        const isDebit = ['RETIRO', 'TRANSFERENCIA_SALIDA', 'TRANSFERENCIA_INTERNA'].includes(m.tipoOperacion)
          && m.idCuentaOrigen == selectedAccId
        return {
          id: m.idTransaccion || `mv-${i}`,
          fecha: new Date(m.fechaCreacion || Date.now()),
          desc: m.descripcion || 'Transacción Bancaria',
          tipo: m.tipoOperacion,
          amount: m.monto,
          saldo: m.saldoResultante,
          isDebit: isDebit
        }
      }).sort((a, b) => b.fecha - a.fecha)
      setTransactions(mapped)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const cuentaActual = state.user.accounts?.find(a => String(a.id) === String(selectedAccId))

  return (
    <div className="main-content fade-in">
      <header className="header-inline">
        <div>
          <h1 className="text-gradient" style={{ fontSize: '38px' }}>Estado de Cuenta</h1>
          <p style={{ color: 'var(--text-muted)' }}>Seguimiento detallado de su actividad financiera</p>
        </div>

        <div style={styles.selectorWrapper}>
          <span style={styles.selectorLabel}>Cuenta activa:</span>
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

      <div style={styles.statsRow}>
        <div className="premium-card" style={styles.statBox}>
          <span style={styles.statLabel}>Saldo Disponible</span>
          <div style={styles.statValue}>
            <span style={{ color: 'var(--primary)' }}>$</span>
            {cuentaActual?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="premium-card" style={styles.statBox}>
          <span style={styles.statLabel}>Entradas (Mes)</span>
          <div style={{ ...styles.statValue, color: 'var(--success)', fontSize: '24px' }}>+$1,240.00</div>
        </div>
        <div className="premium-card" style={styles.statBox}>
          <span style={styles.statLabel}>Salidas (Mes)</span>
          <div style={{ ...styles.statValue, color: 'var(--error)', fontSize: '24px' }}>-$850.20</div>
        </div>
      </div>

      <div className="premium-card" style={{ padding: 0, marginTop: '40px', overflow: 'hidden' }}>
        <div style={styles.tableToolbar}>
          <h3 style={{ fontSize: '18px' }}>Historial de Transacciones</h3>
          <button className="modern-btn modern-btn-outline" onClick={loadMovements} style={{ padding: '8px 16px', fontSize: '12px' }}>
            {loading ? 'Sincronizando...' : 'Actualizar Datos'}
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="modern-table" style={{ margin: '0 24px 24px' }}>
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Concepto / Referencia</th>
                <th>Operación</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id}>
                  <td style={{ fontSize: '13px' }}>
                    <div style={{ fontWeight: '600' }}>{tx.fecha.toLocaleDateString()}</div>
                    <div style={{ opacity: 0.5 }}>{tx.fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: '500', color: 'var(--text)' }}>{tx.desc}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>REF: {tx.id}</div>
                  </td>
                  <td>
                    <span style={{
                      ...styles.badge,
                      background: tx.isDebit ? 'rgba(220, 38, 38, 0.08)' : 'rgba(5, 150, 105, 0.08)',
                      color: tx.isDebit ? 'var(--error)' : 'var(--success)'
                    }}>
                      {tx.tipo.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: '800', color: tx.isDebit ? 'var(--error)' : 'var(--success)' }}>
                    {tx.isDebit ? '-' : '+'}${Number(tx.amount).toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>
                    ${Number(tx.saldo || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && transactions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
              No hay movimientos que mostrar para este periodo.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  selectorWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
  },
  selectorLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  select: {
    padding: '10px 16px',
    borderRadius: '12px',
    border: '1.5px solid var(--border)',
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--primary)',
    background: '#fff',
    outline: 'none',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
    marginTop: '40px',
  },
  statBox: {
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  statLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '800',
    fontFamily: 'Outfit',
  },
  tableToolbar: {
    padding: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border)',
    marginBottom: '8px',
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
  }
}