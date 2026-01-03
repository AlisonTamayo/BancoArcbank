import React, { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { getConsolidada } from '../services/bancaApi'

export default function Home() {
  const { state, setUserAccounts } = useAuth()

  useEffect(() => {
    const loadAccounts = async () => {
      // Usamos la identificación (cédula) guardada en el login
      const id = state.user && state.user.identificacion
      console.log('🔍 Home - Identificacion del usuario:', id)

      if (!id) {
        console.warn('⚠️ No hay identificación, no se cargan cuentas')
        return
      }

      try {
        console.log('📡 Llamando a getConsolidada con:', id)
        const cuentasRaw = await getConsolidada(id)
        console.log('✅ Cuentas crudas recibidas:', cuentasRaw)

        // Mapeo de DTO Backend -> Estado Frontend
        const mapped = (cuentasRaw || []).map(c => ({
          id: String(c.idCuenta),
          number: c.numeroCuenta,
          // Mapeo simple de tipo. Si tienes un endpoint de tipos, mejor.
          type: c.idTipoCuenta === 1 ? "Ahorros" : "Corriente",
          balance: Number(c.saldoDisponible || c.saldoActual || 0)
        }))

        console.log('✅ Cuentas mapeadas para UI:', mapped)
        setUserAccounts(mapped)
      } catch (e) {
        console.error('❌ Error cargando cuentas:', e.message)
      }
    }

    if (state.user) {
      loadAccounts()
    }
  }, [state.user?.identificacion]) // Dependencia segura

  return (
    <div className="home-dashboard">
      <header className="header-inline">
        <div>
          <h1 className="text-gradient" style={{ fontSize: '32px', fontWeight: '800' }}>Panel de Control</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gestiona tus finanzas en Arcbank</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="small" style={{ fontWeight: '600' }}>Bienvenido de nuevo</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>{state.user?.name || "Premium User"}</div>
        </div>
      </header>

      <section style={{ marginTop: '40px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '20px', fontWeight: '700' }}>Tus Productos Financieros</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '24px' }}>
          {state.user?.accounts?.length > 0 ? (
            state.user.accounts.map(a => (
              <div key={a.id} className="premium-card account-card" style={styles.accountCard}>
                <div style={styles.cardHeader}>
                  <div style={styles.chip}></div>
                  <span style={styles.bankName}>ARCBANK</span>
                </div>

                <div style={styles.cardBody}>
                  <div style={styles.accountType}>{a.type}</div>
                  <div style={styles.accountNumber}>•••• •••• •••• {a.number.slice(-4)}</div>
                </div>

                <div style={styles.cardFooter}>
                  <div>
                    <div style={styles.balanceLabel}>Saldo Disponible</div>
                    <div style={styles.balanceValue}>${a.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <Link to={`/movimientos?cuenta=${a.number}`} style={styles.viewLink}>
                    Ver Detalles →
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="premium-card" style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>💳</div>
              <p style={{ color: 'var(--text-muted)' }}>No se encontraron cuentas activas.</p>
            </div>
          )}
        </div>
      </section>

      <section style={{ marginTop: '60px' }}>
        <div style={styles.quickActions}>
          <div className="premium-card" style={styles.actionCard}>
            <div style={{ ...styles.actionIcon, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>🔄</div>
            <h3 style={{ fontSize: '16px', marginTop: '12px' }}>Pagos y Transferencias</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Envía dinero al instante</p>
            <Link to="/transferir" className="modern-btn modern-btn-outline" style={{ marginTop: '16px', fontSize: '14px' }}>Ir a transferir</Link>
          </div>
          <div className="premium-card" style={styles.actionCard}>
            <div style={{ ...styles.actionIcon, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>📊</div>
            <h3 style={{ fontSize: '16px', marginTop: '12px' }}>Resumen Mensual</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Revisa tu progreso financiero</p>
            <Link to="/movimientos" className="modern-btn modern-btn-outline" style={{ marginTop: '16px', fontSize: '14px' }}>Ver estadística</Link>
          </div>
        </div>
      </section>
    </div>
  )
}

const styles = {
  accountCard: {
    padding: '28px',
    background: 'linear-gradient(135deg,rgba(26, 28, 30, 0.95) 0%, rgba(45, 49, 53, 0.95) 100%)',
    color: '#fff',
    border: 'none',
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  },
  chip: {
    width: '45px',
    height: '35px',
    background: 'linear-gradient(135deg, #ffd700 0%, #daa520 100%)',
    borderRadius: '6px',
    opacity: '0.8',
  },
  bankName: {
    fontFamily: 'Outfit',
    fontWeight: '800',
    fontSize: '16px',
    letterSpacing: '2px',
    color: 'var(--accent)',
  },
  cardBody: {
    marginBottom: '32px',
  },
  accountType: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '4px',
  },
  accountNumber: {
    fontSize: '22px',
    fontFamily: 'monospace',
    letterSpacing: '2px',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '4px',
  },
  balanceValue: {
    fontSize: '26px',
    fontWeight: '700',
  },
  viewLink: {
    color: 'var(--accent)',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '600',
  },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
  },
  actionCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  actionIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  }
};