import React, { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { getConsolidada } from '../services/bancaApi'

export default function Home() {
  const { state, setUserAccounts } = useAuth()

  useEffect(() => {
    const loadAccounts = async () => {
      const id = state.user && state.user.identificacion
      if (!id) return

      try {
        const cuentasRaw = await getConsolidada(id)
        const mapped = (cuentasRaw || []).map(c => ({
          id: String(c.idCuenta),
          number: c.numeroCuenta,
          type: c.idTipoCuenta === 1 ? "Ahorros" : "Corriente",
          balance: Number(c.saldoDisponible || c.saldoActual || 0)
        }))
        setUserAccounts(mapped)
      } catch (e) {
        console.error('❌ Error cargando cuentas:', e.message)
      }
    }

    if (state.user) loadAccounts()
  }, [state.user?.identificacion, setUserAccounts])

  return (
    <div className="main-content fade-in">
      <header className="header-inline">
        <div>
          <h1 className="text-gradient" style={{ fontSize: '38px', letterSpacing: '-1px' }}>Global Portfolio</h1>
          <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Resumen de sus activos en ARCBANK Premium</p>
        </div>
        <div style={styles.dateLabel}>
          {new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </header>

      <section style={{ marginTop: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '800' }}>Cuentas y Productos</h2>
          <span style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: '700' }}>{state.user?.accounts?.length || 0} Activos</span>
        </div>

        <div style={styles.cardGrid}>
          {state.user?.accounts?.length > 0 ? (
            state.user.accounts.map(a => (
              <div key={a.id} className="premium-card" style={styles.metalCard}>
                <div style={styles.metalOverlay}></div>
                <div style={styles.cardInfo}>
                  <div style={styles.cardHead}>
                    <div style={styles.chip}></div>
                    <div style={styles.cardBrand}>ARCBANK</div>
                  </div>

                  <div style={styles.cardMiddle}>
                    <div style={styles.accTypeBadge}>{a.type}</div>
                    <div style={styles.accNum}>{a.number.replace(/(.{4})/g, '$1 ')}</div>
                  </div>

                  <div style={styles.cardBottom}>
                    <div style={styles.balContainer}>
                      <div style={styles.balLabel}>Saldo Disponible</div>
                      <div style={styles.balValue}>
                        <span style={styles.currency}>$</span>
                        {a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <Link to="/movimientos" style={styles.miniBtn}>Detalles</Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="premium-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px' }}>
              <p style={{ color: 'var(--text-muted)' }}>Cargando portafolio...</p>
            </div>
          )}
        </div>
      </section>

      <section style={{ marginTop: '64px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '24px', fontWeight: '800' }}>Atajos Ejecutivos</h2>
        <div style={styles.shortcutGrid}>
          <div className="premium-card" style={styles.shortcutCard}>
            <div style={styles.iconCircle}>💳</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '16px' }}>Transferencias Directas</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Mueva fondos entre cuentas Arcbank</p>
            </div>
            <Link to="/transferir" className="modern-btn modern-btn-outline" style={{ padding: '8px 16px', fontSize: '12px' }}>Iniciar</Link>
          </div>

          <div className="premium-card" style={styles.shortcutCard}>
            <div style={styles.iconCircle}>🌐</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '16px' }}>Red Interbancaria</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pagos a nivel nacional e internacional</p>
            </div>
            <Link to="/interbancarias" className="modern-btn modern-btn-outline" style={{ padding: '8px 16px', fontSize: '12px' }}>Operar</Link>
          </div>
        </div>
      </section>
    </div>
  )
}

const styles = {
  dateLabel: {
    background: '#fff',
    padding: '8px 20px',
    borderRadius: '30px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    boxShadow: 'var(--shadow-premium)',
    textTransform: 'capitalize',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
    gap: '32px',
  },
  metalCard: {
    padding: 0,
    background: '#1a1c1e',
    height: '240px',
    color: '#fff',
    position: 'relative',
    overflow: 'hidden',
    border: 'none',
  },
  metalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 100%)',
    zIndex: 1,
  },
  cardInfo: {
    position: 'relative',
    zIndex: 2,
    padding: '32px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cardHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chip: {
    width: '50px',
    height: '38px',
    background: 'linear-gradient(135deg, #dfc18d 0%, #8e6d2f 100%)',
    borderRadius: '8px',
    position: 'relative',
    '&:after': {
      content: '""',
      position: 'absolute',
      width: '30px', height: '1px', background: 'rgba(0,0,0,0.1)', top: '50%', left: '10%'
    }
  },
  cardBrand: {
    fontFamily: 'Outfit',
    fontWeight: '800',
    letterSpacing: '3px',
    fontSize: '14px',
    color: 'var(--primary)',
  },
  cardMiddle: {
    marginTop: '20px',
  },
  accTypeBadge: {
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '8px',
  },
  accNum: {
    fontSize: '22px',
    fontFamily: 'monospace',
    letterSpacing: '2px',
    color: '#fff',
  },
  cardBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  balLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '1px',
    marginBottom: '4px',
  },
  balValue: {
    fontSize: '32px',
    fontWeight: '700',
    fontFamily: 'Outfit',
  },
  currency: {
    fontSize: '18px',
    marginRight: '6px',
    color: 'var(--primary)',
  },
  miniBtn: {
    color: 'var(--primary)',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '700',
    padding: '6px 14px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
  },
  shortcutGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
  },
  shortcutCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '30px',
  },
  iconCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'var(--bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
  }
}