import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMovimientos } from '../services/bancaApi'
import { FiFilter, FiDownload, FiSearch } from 'react-icons/fi'

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
        desc: m.descripcion || 'Transacción Bancaria',
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

  const currentAcc = state.user.accounts.find(a => String(a.id) === String(selectedAccId))

  return (
    <div className="main-container animate-slide-up">
      <header className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h5 className="text-warning fw-bold mb-2" style={{ letterSpacing: '4px' }}>EXTRACTOS BANCARIOS</h5>
          <h1 className="display-5 fw-bold text-white">Libro de <span className="gold-text">Movimientos</span></h1>
        </div>
        <div className="d-flex gap-3">
          <button className="btn btn-outline-gold d-flex align-items-center gap-2 fw-bold">
            <FiDownload /> DESCARGAR PDF
          </button>
        </div>
      </header>

      <div className="glass-panel p-4 mb-5">
        <div className="row g-4 align-items-center">
          <div className="col-md-5">
            <label className="label-text small">INSTRUMENTO FINANCIERO</label>
            <div className="input-group">
              <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: 'var(--glass-border)' }}>
                <FiSearch className="text-warning" />
              </span>
              <select
                className="form-control form-control-luxury border-start-0"
                value={selectedAccId}
                onChange={e => setSelectedAccId(e.target.value)}
              >
                {state.user.accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.number} — {a.type}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-md-4 offset-md-3 text-end">
            <div className="glass-card py-2 px-4 d-inline-block" style={{ borderLeft: '4px solid var(--gold-primary)' }}>
              <small className="text-muted fw-bold d-block" style={{ fontSize: '10px' }}>SALDO DISPONIBLE</small>
              <span className="h4 m-0 fw-bold text-white">
                $ {currentAcc?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-0 overflow-hidden">
        <div className="p-4 border-bottom d-flex justify-content-between align-items-center" style={{ borderColor: 'var(--glass-border) !important' }}>
          <h5 className="m-0 fw-bold d-flex align-items-center gap-2">
            <FiFilter className="text-warning" /> REGISTRO CRONOLÓGICO
          </h5>
          <div className="small text-muted fw-bold">{txs.length} OPERACIONES DETECTADAS</div>
        </div>
        <div className="table-responsive">
          <table className="table table-luxury m-0">
            <thead>
              <tr>
                <th className="ps-4">FECHA / HORA</th>
                <th>CONCEPTO DE OPERACIÓN</th>
                <th>TIPO</th>
                <th className="text-end">MONTO</th>
                <th className="text-end pe-4">BALANCE RESULTANTE</th>
              </tr>
            </thead>
            <tbody>
              {txs.map(tx => (
                <tr key={tx.id}>
                  <td className="ps-4 py-3">
                    <div className="fw-bold text-white">{tx.date.toLocaleDateString()}</div>
                    <div className="small text-muted">{tx.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="py-3">
                    <div className="fw-bold text-white">{tx.desc}</div>
                    <code className="x-small text-warning" style={{ fontSize: '10px' }}>ID: {tx.id}</code>
                  </td>
                  <td className="py-3">
                    <span className={`badge ${tx.isDebit ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'} border px-3 py-2`} style={{ fontSize: '10px', letterSpacing: '1px' }}>
                      {tx.type}
                    </span>
                  </td>
                  <td className={`text-end py-3 fw-bold h5 mb-0 ${tx.isDebit ? 'text-danger' : 'text-success'}`}>
                    {tx.isDebit ? '-' : '+'}$ {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-end pe-4 py-3 fw-bold text-white h5 mb-0" style={{ fontFamily: 'monospace' }}>
                    $ {tx.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {txs.length === 0 && !loading && (
            <div className="text-center p-5 text-muted fw-bold">
              NO HAY MOVIMIENTOS REGISTRADOS PARA ESTA CUENTA
            </div>
          )}
        </div>
      </div>
    </div>
  )
}