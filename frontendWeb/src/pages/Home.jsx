import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { getConsolidada } from '../services/bancaApi'
import { FiPlus, FiArrowUpRight, FiPieChart, FiSettings } from 'react-icons/fi'

export default function Home() {
  const { state, setUserAccounts } = useAuth()
  const [totalBalance, setTotalBalance] = useState(0)

  useEffect(() => {
    const load = async () => {
      const id = state.user?.identificacion
      if (!id) return
      try {
        const raw = await getConsolidada(id)
        const mapped = (raw || []).map(c => ({
          id: String(c.idCuenta),
          number: c.numeroCuenta,
          type: c.idTipoCuenta === 1 ? "CUENTA AHORROS" : "CUENTA CORRIENTE",
          balance: Number(c.saldoDisponible || 0)
        }))
        setUserAccounts(mapped)
        setTotalBalance(mapped.reduce((acc, curr) => acc + curr.balance, 0))
      } catch (e) {
        console.error(e)
      }
    }
    if (state.user) load()
  }, [state.user?.identificacion, setUserAccounts])

  return (
    <div className="animate-slide-up">
      <header className="d-flex justify-content-between align-items-end mb-5">
        <div>
          <h5 className="text-warning fw-bold mb-2" style={{ letterSpacing: '4px' }}>RESUMEN FINANCIERO</h5>
          <h1 className="display-4 fw-bold">Bienvenido, <span className="gold-text">{state.user?.name?.split(' ')[0]}</span></h1>
        </div>
        <div className="text-end glass-card p-4" style={{ borderLeft: '4px solid var(--gold-primary)' }}>
          <small className="text-muted fw-bold d-block mb-1" style={{ letterSpacing: '2px' }}>PATRIMONIO TOTAL</small>
          <div className="h2 m-0 fw-black text-white">$ {totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
      </header>

      <div className="row g-4 mb-5">
        <div className="col-12 col-xl-8">
          <h4 className="fw-bold mb-4 d-flex align-items-center gap-2">
            <FiPieChart className="text-warning" /> MIS CUENTAS PRESTIGE
          </h4>
          <div className="row g-4">
            {state.user?.accounts?.map(acc => (
              <div key={acc.id} className="col-md-6">
                <div className="glass-panel p-4 h-100 d-flex flex-column justify-content-between" style={styles.card}>
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div>
                        <div className="small fw-bold text-warning mb-1" style={{ letterSpacing: '1px' }}>{acc.type}</div>
                        <div className="h5 text-white fw-bold mb-0" style={{ letterSpacing: '2px' }}>{acc.number}</div>
                      </div>
                      <div style={styles.chip}></div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <small className="text-muted fw-bold">SALDO DISPONIBLE</small>
                    <div className="h3 fw-bold text-white mb-3">$ {acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    <Link to="/movimientos" className="btn btn-outline-gold w-100 py-2 fw-bold small">VER ACTIVIDAD</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <h4 className="fw-bold mb-4 d-flex align-items-center gap-2">
            <FiSettings className="text-warning" /> ACCIONES RÁPIDAS
          </h4>
          <div className="glass-panel p-4 h-100">
            <div className="d-grid gap-3">
              <Link to="/transferir" className="btn btn-primary d-flex align-items-center justify-content-center gap-3 py-3">
                <FiArrowUpRight size={20} /> REALIZAR TRANSFERENCIA
              </Link>
              <Link to="/interbancarias" className="btn btn-outline-gold d-flex align-items-center justify-content-center gap-3 py-3 fw-bold">
                <FiPlus size={20} /> PAGO INTERBANCARIO
              </Link>
            </div>
            <div className="mt-5 p-4 rounded-4 glass-card text-center" style={{ border: '1px dashed var(--gold-primary)' }}>
              <div className="h1 mb-2">💎</div>
              <div className="fw-bold text-warning mb-1">Membresía Elite</div>
              <p className="small text-muted mb-0">Disfrute de beneficios exclusivos en todas sus operaciones.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  card: {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(212,175,55,0.05) 100%)',
    border: '1px solid var(--glass-border) !important',
  },
  chip: {
    width: '45px',
    height: '32px',
    background: 'var(--gold-gradient)',
    borderRadius: '6px',
    opacity: 0.8
  }
}