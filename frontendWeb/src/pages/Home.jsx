import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { getConsolidada } from '../services/bancaApi'

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
          type: c.idTipoCuenta === 1 ? "ELITE SAVINGS" : "PRESTIGE CHECKING",
          balance: Number(c.saldoDisponible || 0)
        }))
        setUserAccounts(mapped)
        const total = mapped.reduce((acc, curr) => acc + curr.balance, 0)
        setTotalBalance(total)
      } catch (e) {
        console.error(e)
      }
    }
    if (state.user) load()
  }, [state.user?.identificacion, setUserAccounts])

  return (
    <div className="main-content" style={{ animation: 'slideIn 0.8s ease' }}>
      <header style={styles.header}>
        <div>
          <h2 style={{ fontSize: '14px', letterSpacing: '3px', color: 'var(--gold-primary)', marginBottom: '10px' }}>ESTADO PATRIMONIAL</h2>
          <h1 className="title-xl">Binvenido, {state.user?.name || "Member"}</h1>
        </div>
        <div style={styles.totalBox}>
          <div style={styles.totalLabel}>PATRIMONIO TOTAL</div>
          <div style={styles.totalValue}>${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
      </header>

      <section style={{ marginTop: '60px' }}>
        <h3 style={styles.sectionTitle}>ACTIVOS DISPONIBLES</h3>
        <div style={styles.accountGrid}>
          {state.user?.accounts?.map(acc => (
            <div key={acc.id} className="premium-card" style={styles.accCard}>
              <div style={styles.accType}>{acc.type}</div>
              <div style={styles.accNum}>{acc.number}</div>
              <div style={styles.accDivider}></div>
              <div style={styles.accBalance}>
                <span style={{ fontSize: '18px', color: 'var(--gold-primary)' }}>VALOR: </span>
                ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <Link to="/movimientos" style={styles.accLink}>ANALIZAR OPERACIONES →</Link>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: '80px' }}>
        <h3 style={styles.sectionTitle}>OPERACIONES RÁPIDAS</h3>
        <div style={styles.actionGrid}>
          <Link to="/transferir" style={styles.actionItem} className="premium-card">
            <div style={styles.actionIcon}>⚡</div>
            <div style={styles.actionText}>
              <h4>TRANSFERENCIA INSTANTÁNEA</h4>
              <p>Mueva capital entre cuentas Elite</p>
            </div>
          </Link>
          <Link to="/interbancarias" style={styles.actionItem} className="premium-card">
            <div style={styles.actionIcon}>🌐</div>
            <div style={styles.actionText}>
              <h4>RED GLOBAL</h4>
              <p>Operaciones fuera del ecosistema ARCBANK</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  )
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: '80px',
  },
  totalBox: {
    textAlign: 'right',
    padding: '20px 40px',
    background: 'linear-gradient(135deg, #111 0%, #000 100%)',
    border: '1px solid var(--gold-primary)',
    borderRadius: '4px',
    boxShadow: 'var(--glow-gold)',
  },
  totalLabel: {
    fontSize: '10px',
    letterSpacing: '2px',
    color: 'var(--gold-primary)',
    marginBottom: '5px',
  },
  totalValue: {
    fontSize: '32px',
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'monospace',
  },
  sectionTitle: {
    fontSize: '12px',
    letterSpacing: '5px',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: '30px',
    fontWeight: '900',
  },
  accountGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '30px',
  },
  accCard: {
    padding: '40px',
  },
  accType: {
    fontSize: '10px',
    letterSpacing: '2px',
    color: 'var(--gold-primary)',
    marginBottom: '10px',
  },
  accNum: {
    fontSize: '24px',
    fontWeight: '300',
    letterSpacing: '4px',
    color: '#fff',
  },
  accDivider: {
    height: '1px',
    background: 'linear-gradient(90deg, var(--gold-primary), transparent)',
    margin: '25px 0',
  },
  accBalance: {
    fontSize: '36px',
    fontWeight: '900',
    color: '#fff',
    marginBottom: '20px',
  },
  accLink: {
    color: 'var(--gold-primary)',
    textDecoration: 'none',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '1px',
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '24px',
  },
  actionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '25px',
    textDecoration: 'none',
    color: 'inherit',
  },
  actionIcon: {
    fontSize: '32px',
    background: 'rgba(212, 175, 55, 0.1)',
    width: '70px',
    height: '70px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
  },
  actionText: {
    '& h4': {
      fontSize: '14px',
      letterSpacing: '1px',
      marginBottom: '5px',
    },
    '& p': {
      fontSize: '12px',
      color: 'var(--text-dim)',
    }
  }
}