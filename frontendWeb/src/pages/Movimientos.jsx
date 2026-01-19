import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMovimientos, solicitarReverso, getMotivosDevolucion } from '../services/bancaApi'
import { FiFilter, FiDownload, FiSearch } from 'react-icons/fi'

export default function Movimientos() {
  const { state, refreshAccounts } = useAuth()
  const [selectedAccId, setSelectedAccId] = useState('')
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(false)
  const [refundModal, setRefundModal] = useState({ show: false, tx: null })
  const [reason, setReason] = useState('FRAD')
  const [reasonsList, setReasonsList] = useState([])

  useEffect(() => {
    // Cargar catálogo dinámico de motivos al iniciar
    getMotivosDevolucion()
      .then(data => {
        if (data && Array.isArray(data)) {
          setReasonsList(data);
          if (data.length > 0) setReason(data[0].code); // Seleccionar el primero por defecto
        }
      })
      .catch(e => console.warn("No se pudo cargar catálogo de motivos:", e));
  }, []);

  const handleRefund = async () => {
    /* ... (unchanged code) ... */

    if (!refundModal.tx) return;
    if (!window.confirm(`¿Estás seguro de solicitar el reverso de $${refundModal.tx.amount}?`)) return;

    try {
      await solicitarReverso(refundModal.tx.id, reason);
      alert('✅ Solicitud de devolución enviada exitosamente.');
      setRefundModal({ show: false, tx: null });
      load(); // Refresh
    } catch (e) {
      alert('❌ Error: ' + e.message);
    }
  }

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
      const mapped = list.map(m => {
        const isDebit = ['RETIRO', 'TRANSFERENCIA_SALIDA', 'TRANSFERENCIA_INTERNA', 'TRANSFERENCIA_INTERBANCARIA'].includes(m.tipoOperacion)
          && String(m.idCuentaOrigen) === String(selectedAccId)

        let displayType = m.tipoOperacion
        if (m.tipoOperacion === 'TRANSFERENCIA_INTERBANCARIA') {
          displayType = 'INTERBANCARIA SALIENTE'
        } else if (m.tipoOperacion === 'TRANSFERENCIA_ENTRADA') {
          displayType = 'INTERBANCARIA ENTRANTE'
        }

        return {
          id: m.idTransaccion,
          date: new Date(m.fechaCreacion),
          desc: m.descripcion || 'Transacción Bancaria',
          type: displayType,
          amount: m.monto,
          balance: m.saldoResultante,
          isDebit,
          isRefundable: isDebit && (new Date() - new Date(m.fechaCreacion) < 24 * 60 * 60 * 1000)
            && (m.tipoOperacion === 'TRANSFERENCIA_SALIDA' || m.tipoOperacion === 'TRANSFERENCIA_INTERBANCARIA')
        }
      }).sort((a, b) => b.date - a.date)
      setTxs(mapped)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const currentAcc = state.user.accounts.find(a => String(a.id) === String(selectedAccId))

  return (
    <div className="animate-slide-up">
      <header className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h5 className="text-warning fw-bold mb-2" style={{ letterSpacing: '4px' }}>MOVIMIENTOS</h5>
          <h1 className="display-5 fw-bold text-white">Historial <span className="gold-text">Completo</span></h1>
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
            <FiFilter className="text-warning" /> DETALLE DE MOVIMIENTOS
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
                  <td className="text-end pe-4 py-3">
                    {tx.isRefundable && (
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        style={{ fontSize: '0.7rem' }}
                        onClick={() => setRefundModal({ show: true, tx })}
                      >
                        ↩️ Solicitar Devolución
                      </button>
                    )}
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


      {/* Modal Devolución */}
      {
        refundModal.show && (
          <div className="modal-backdrop-glass d-flex justify-content-center align-items-center"
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', zIndex: 9999 }}>
            <div className="glass-panel p-4" style={{ width: '400px', maxWidth: '90%' }}>
              <h5 className="text-white fw-bold mb-3">↩️ Solicitar Devolución</h5>
              <p className="text-muted small">
                Estás a punto de revertir una transferencia de <strong className="text-white">${refundModal.tx.amount}</strong>.
              </p>

              <label className="label-text mb-2">MOTIVO DEL RECLAMO</label>
              <select className="form-control form-control-luxury mb-4"
                value={reason} onChange={e => setReason(e.target.value)}>
                {reasonsList.length > 0 ? (
                  reasonsList.map(r => (
                    <option key={r.code} value={r.code}>
                      {r.description} ({r.code})
                    </option>
                  ))
                ) : (
                  // Fallback por si falla la carga dinámica (Códigos ISO 20022)
                  <>
                    <option value="FR01">🚨 Fraude Confirmado (FR01)</option>
                    <option value="MS03">🔁 Error Técnico / Procesamiento (MS03)</option>
                    <option value="MD01">👯‍♀️ Pago Duplicado (MD01)</option>
                    <option value="AC03">🚫 Cuenta Inválida / Cerrada (AC03)</option>
                  </>
                )}
              </select>

              <div className="d-flex gap-2 justify-content-end">
                <button className="btn btn-outline-light" onClick={() => setRefundModal({ show: false, tx: null })}>
                  Cancelar
                </button>
                <button className="btn btn-gold" onClick={handleRefund}>
                  Confirmar y Enviar
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  )
}