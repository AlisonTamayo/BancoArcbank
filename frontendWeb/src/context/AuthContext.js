import React, { createContext, useContext, useEffect, useState } from 'react'
import { getConsolidada } from '../services/bancaApi'

// URL Base del Gateway - vacío para usar rutas relativas (nginx hace proxy a api-gateway)
export const API_BASE = ''

export async function apiFetch(path, options = {}) {
  const base = API_BASE
  // Si path empieza con http, usalo tal cual, sino concatena base
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : '/' + path}`

  console.log(`🌐 [AuthContext] Fetching: ${url}`)

  const opts = {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    // credentials: 'include', // Descomentar si usas cookies/sesiones
    ...options
  }

  try {
    const res = await fetch(url, opts)

    // Manejo robusto del body (json o texto)
    const text = await res.text()
    let data = null
    try { data = text ? JSON.parse(text) : null } catch (e) { data = text }

    if (!res.ok) {
      const error = new Error(res.statusText || 'Error en la petición')
      error.status = res.status
      // Normalizamos el error del backend a un campo message
      error.message = (data && (data.mensaje || data.error)) || res.statusText
      error.body = data
      throw error
    }
    return data
  } catch (error) {
    console.error("❌ Error en apiFetch:", error)
    throw error
  }
}

const AuthContext = createContext()

const initialUser = {
  id: 'user-guest',
  name: 'Invitado',
  phone: '',
  email: '',
  address: '',
  accounts: [],
  identificacion: null,
  idUsuarioWeb: null
}

function readState() {
  const s = localStorage.getItem('namca_state')
  if (s) {
    try { return JSON.parse(s) } catch (e) { console.error("Error parsing state", e) }
  }

  const state = { user: initialUser, transactions: [] }
  return state
}

export function AuthProvider({ children }) {

  const [state, setState] = useState(() => {
    const saved = readState()

    // Restaurar datos críticos si existen sueltos en localStorage
    const storedIdent = localStorage.getItem('namca_identificacion')
    const storedIdUsuarioWeb = localStorage.getItem('namca_idUsuarioWeb')

    if (storedIdent) saved.user.identificacion = storedIdent
    if (storedIdUsuarioWeb) saved.user.idUsuarioWeb = Number(storedIdUsuarioWeb)

    return saved
  })

  // Estado derivado de la existencia de token o flag de login
  const [loggedIn, setLoggedIn] = useState(() => !!localStorage.getItem('namca_logged'))

  // Persistencia automática del estado completo
  useEffect(() => {
    localStorage.setItem('namca_state', JSON.stringify(state))
  }, [state])

  const login = async (username, password) => {
    if (!username || !password) return { ok: false, error: 'Usuario y contraseña requeridos' }

    try {
      // Login real usando el endpoint de autenticación en micro-clientes
      const cliente = await apiFetch('/api/v1/clientes/login', {
        method: 'POST',
        body: JSON.stringify({
          identificacion: username,
          clave: password
        })
      })

      if (!cliente || !cliente.idCliente) {
        return { ok: false, error: 'Credenciales inválidas' }
      }

      localStorage.setItem('namca_logged', '1')
      localStorage.setItem('namca_username', username.toUpperCase())

      const identificacion = cliente.identificacion || username
      const idUsuarioWeb = cliente.idCliente
      const nombreCompleto = cliente.nombreCompleto || `Cliente ${cliente.idCliente}`

      console.log('✅ Login exitoso:', { identificacion, idUsuarioWeb, nombreCompleto })

      if (identificacion) localStorage.setItem('namca_identificacion', identificacion)
      if (idUsuarioWeb) localStorage.setItem('namca_idUsuarioWeb', String(idUsuarioWeb))

      setState(s => ({
        ...s,
        user: {
          ...s.user,
          name: nombreCompleto,
          identificacion,
          idUsuarioWeb
        }
      }))

      setLoggedIn(true)
      return { ok: true, body: cliente }
    } catch (err) {
      console.error('Error en login:', err)
      return { ok: false, error: err.message || 'Cliente no encontrado o error de conexión' }
    }
  }

  const logout = () => {
    localStorage.removeItem('namca_logged')
    localStorage.removeItem('namca_username')
    localStorage.removeItem('namca_identificacion')
    localStorage.removeItem('namca_idUsuarioWeb')
    localStorage.removeItem('namca_state')

    setState({ user: { ...initialUser, accounts: [] }, transactions: [] })
    setLoggedIn(false)
  }

  const updateUser = (patch) => {
    setState(s => ({
      ...s,
      user: { ...s.user, ...patch }
    }))
  }

  const persistIdentification = (identificacion, idUsuarioWeb) => {
    if (identificacion) localStorage.setItem('namca_identificacion', identificacion)
    if (idUsuarioWeb) localStorage.setItem('namca_idUsuarioWeb', String(idUsuarioWeb))
    updateUser({ identificacion, idUsuarioWeb })
  }

  const setUserAccounts = (accounts) => {
    setState(s => ({ ...s, user: { ...s.user, accounts } }))
  }

  const addTransaction = (tx) => {
    // tx: { accId, amount, description, type }
    setState(s => {
      const txs = [tx, ...(s.transactions || [])]

      // Actualización optimista del saldo
      const accounts = s.user.accounts.map(a => {
        if (String(a.id) === String(tx.accId)) {
          const newBalance = Number((a.balance + tx.amount).toFixed(2))
          return { ...a, balance: newBalance }
        }
        return a
      })

      return { ...s, transactions: txs, user: { ...s.user, accounts } }
    })
  }

  const updateAccountBalance = (accId, newBalance) => {
    setState(s => ({
      ...s,
      user: {
        ...s.user,
        accounts: s.user.accounts.map(a =>
          String(a.id) === String(accId)
            ? { ...a, balance: Number(Number(newBalance).toFixed(2)) }
            : a
        )
      }
    }))
  }

  const refreshAccounts = async () => {
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
      console.error('❌ Error refrescando cuentas:', e)
    }
  }

  return (
    <AuthContext.Provider value={{
      state,
      login,
      logout,
      loggedIn,
      updateUser,
      persistIdentification,
      setUserAccounts,
      addTransaction,
      updateAccountBalance,
      refreshAccounts
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}