import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMovimientos } from '../services/bancaApi'
import './Movimientos.css'

export default function Movimientos() {
  const { state, refreshAccounts } = useAuth()

  // Estado de cuenta seleccionada (Guardamos el ID para el backend)
  const [selectedAccId, setSelectedAccId] = useState('')

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)

  // Carga inicial: Seleccionar la primera cuenta si existe
  useEffect(() => {
    if (state.user.accounts && state.user.accounts.length > 0 && !selectedAccId) {
      setSelectedAccId(state.user.accounts[0].id)
    }
  }, [state.user.accounts])

  // Cargar movimientos cuando cambia la cuenta
  useEffect(() => {
    if (selectedAccId) {
      loadMovements()
    }
  }, [selectedAccId])

  const loadMovements = async () => {
    if (!selectedAccId) return

    setLoading(true)
    try {
      // Refrescar saldos de cuentas primero
      await refreshAccounts()

      const resp = await getMovimientos(selectedAccId)
      console.log('Movimientos recibidos:', resp)

      // Mapeo de respuesta DTO -> Vista
      const listaRaw = Array.isArray(resp) ? resp : []

      const movsAll = listaRaw.map((m, i) => {
        // Determinar si es débito (sale dinero) o crédito (entra dinero)
        const isDebit = ['RETIRO', 'TRANSFERENCIA_SALIDA', 'TRANSFERENCIA_INTERNA'].includes(m.tipoOperacion)
          && m.idCuentaOrigen == selectedAccId

        // Formatear fecha
        let fechaStr = 'Sin fecha'
        if (m.fechaCreacion) {
          const fecha = new Date(m.fechaCreacion)
          fechaStr = fecha.toLocaleDateString('es-EC', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        }

        return {
          id: m.idTransaccion || `mv-${i}`,
          fecha: fechaStr,
          desc: m.descripcion || '-',
          tipo: m.tipoOperacion,
          amount: m.monto,
          saldoResultante: m.saldoResultante,
          isDebit: isDebit,
          referencia: m.referencia
        }
      })

      // Ordenar por ID descendente (más reciente primero)
      const sorted = movsAll.sort((a, b) => b.id - a.id)
      setTransactions(sorted)

    } catch (e) {
      console.error('Error cargando movimientos:', e)
    } finally {
      setLoading(false)
    }
  }

  // Obtener la cuenta seleccionada para mostrar info
  const cuentaActual = state.user.accounts?.find(a => a.id == selectedAccId)

  return (
    <div className="mov-page">
      <header className="header-inline">
        <div>
          <h1 className="text-gradient" style={{ fontSize: '32px', fontWeight: '800' }}>Historial Financiero</h1>
          <p style={{ color: 'var(--text-muted)' }}>Revisa el detalle de tus transacciones</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="premium-card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface)' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>CUENTA:</span>
            <select
              value={selectedAccId}
              onChange={e => setSelectedAccId(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontWeight: '700', color: 'var(--primary)', outline: 'none', cursor: 'pointer' }}
            >
              {state.user.accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.number} ({a.type})
                </option>
              ))}
            </select>
          </div>
          <button className="modern-btn modern-btn-primary" style={{ padding: '10px 20px' }} onClick={loadMovements} disabled={loading}>
            {loading ? '⏳' : '🔄 Actualizar'}
          </button>
        </div>
      </header>

      {cuentaActual && (
        <div className="premium-card" style={styles.summaryCard}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Saldo en Línea</span>
            <span style={styles.summaryValue}>${cuentaActual.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ width: '2px', height: '40px', background: 'rgba(255,255,255,0.1)' }}></div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Tipo de Cuenta</span>
            <span style={{ ...styles.summaryValue, fontSize: '18px' }}>{cuentaActual.type}</span>
          </div>
        </div>
      )}

      <div className="premium-card" style={{ marginTop: '32px', padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Últimos Movimientos</h3>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{transactions.length} transacciones registradas</div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div className="loading-spinner"></div>
              <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Sincronizando con el servidor...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: '80px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>empty</div>
              <h3 style={{ color: 'var(--text-muted)' }}>No hay actividad registrada aún</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Tus movimientos aparecerán aquí una vez que realices una operación.</p>
            </div>
          ) : (
            <table className="modern-table" style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>FECHA Y HORA</th>
                  <th style={styles.th}>DESCRIPCIÓN</th>
                  <th style={styles.th}>MONTO</th>
                  <th style={styles.th}>SALDO</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: '600', color: 'var(--text)' }}>{tx.fecha.split(',')[0]}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tx.fecha.split(',')[1]}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: '500' }}>{tx.desc}</div>
                      <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '700', letterSpacing: '0.5px' }}>
                        {tx.tipo.replace(/_/g, ' ')}
                      </div>
                    </td>
                    <td style={{ ...styles.td, fontWeight: '700' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: tx.isDebit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: tx.isDebit ? 'var(--error)' : 'var(--success)'
                      }}>
                        {tx.isDebit ? '-' : '+'}${Number(tx.amount).toFixed(2)}
                      </span>
                    </td>
                    <td style={{ ...styles.td, fontWeight: '600', color: 'var(--secondary)' }}>
                      ${Number(tx.saldoResultante || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  summaryCard: {
    marginTop: '32px',
    background: 'var(--primary-gradient)',
    color: '#fff',
    border: 'none',
    display: 'flex',
    gap: '60px',
    padding: '32px 40px',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  summaryLabel: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    opacity: '0.8',
    marginBottom: '4px',
  },
  summaryValue: {
    fontSize: '32px',
    fontWeight: '800',
    fontFamily: 'Outfit',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    background: 'rgba(0,0,0,0.02)',
    borderBottom: '1px solid var(--border)',
  },
  th: {
    padding: '16px 24px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid var(--border)',
    transition: 'background 0.2s',
  },
  td: {
    padding: '20px 24px',
    fontSize: '14px',
  }
};