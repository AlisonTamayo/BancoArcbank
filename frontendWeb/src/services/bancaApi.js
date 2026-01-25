import { apiFetch } from '../context/AuthContext'

// APUNTAMOS AL GATEWAY via nginx proxy (rutas relativas)
// nginx hace proxy de /api/* hacia api-gateway:8080
const GATEWAY_URL = "";

/**
 * Función genérica para peticiones al Gateway
 */
async function request(path, options = {}) {
  const url = `${GATEWAY_URL}${path}`;
  console.log(`🌐 Request [${options.method || 'GET'}]:`, url);

  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const msg = errorBody.mensaje || errorBody.error || res.statusText;
    console.error("❌ Error response:", msg);
    throw new Error(msg);
  }

  // Manejo especial para respuestas vacías (204)
  if (res.status === 204) return null;
  return res.json();
}

// Mapeo Amigable de Errores Switch (ISO 20022)
export function parseIsoError(msg) {
  if (!msg) return "Error desconocido del sistema.";

  // Buscar el código de 4 letras al principio (ej: "AM04 - Fondos...")
  const codeMatch = msg.match(/([A-Z0-9]{4})/);
  const code = codeMatch ? codeMatch[1] : null;

  const map = {
    'AC00': '✅ Transacción completada exitosamente.',
    'AM04': '🚫 Saldo insuficiente para esta operación.',
    'AC01': '❌ cuenta inválida. Verifica el número.',
    'AC04': '🔒 Cuenta cerrada o inactiva en destino.',
    'MS03': '⚠️ Error técnico en el otro banco. Intenta luego.',
    'MD01': '⚠️ Operación duplicada. Ya se procesó.',
    'AG01': '⛔ Operación no permitida por políticas.',
    'BE01': '👮 Datos inconsistentes. Rechazada por seguridad.',
    'RC01': '📝 Error en datos enviados. Contacte soporte.',
    'AC03': '❌ Cuenta destino inválida.'
  };

  if (code && map[code]) {
    return `${map[code]} (${code})`;
  }

  return msg; // Si no hay código conocido, devolver el original
}

// --- CLIENTES (Gateway -> micro-clientes) ---

export async function getClientePorIdentificacion(identificacion) {
  // GET /api/v1/clientes/identificacion/{identificacion}
  return await request(`/api/v1/clientes/identificacion/${identificacion}`);
}

// --- CUENTAS (Gateway -> micro-cuentas) ---

export async function getCuentaPorNumero(numeroCuenta) {
  // GET /api/v1/cuentas/ahorros/buscar/{numero}
  return await request(`/api/v1/cuentas/ahorros/buscar/${numeroCuenta}`);
}

/**
 * SIMULACIÓN DE POSICIÓN CONSOLIDADA
 * Como no tenemos endpoint "traer cuentas por idCliente", traemos todas y filtramos.
 * @param {string} identificacion - Cédula del usuario logueado
 */
export async function getConsolidada(identificacion) {
  try {
    // 1. Primero necesitamos saber el ID interno del cliente usando su cédula
    const cliente = await getClientePorIdentificacion(identificacion);
    if (!cliente || !cliente.idCliente) return [];

    // 2. Traemos todas las cuentas (Endpoint de listar todas)
    // OJO: Esto es solo para demo. En prod es ineficiente y peligroso.
    const todasLasCuentas = await request('/api/v1/cuentas/ahorros');

    // 3. Filtramos las que pertenecen a este cliente
    const cuentasDelUsuario = todasLasCuentas.filter(c => c.idCliente === cliente.idCliente);

    return cuentasDelUsuario;
  } catch (e) {
    console.warn("Error cargando consolidada:", e);
    return [];
  }
}

// --- TRANSACCIONES (Gateway -> ms-transaccion) ---

export async function getMovimientos(idCuenta, fechaInicio, fechaFin) {
  // Recibe el ID de la cuenta directamente (no el número de cuenta)
  try {
    if (!idCuenta) return [];

    // GET /api/transacciones/cuenta/{idCuenta}
    const movs = await request(`/api/transacciones/cuenta/${idCuenta}`);

    // Mapear fechaCreacion a fecha para compatibilidad con el componente
    return movs.map(m => ({
      ...m,
      fecha: m.fechaCreacion || m.fecha
    }));
  } catch (e) {
    console.error("Error cargando movimientos:", e);
    return [];
  }
}

export async function realizarTransferencia(payload) {
  // payload: { idCuentaOrigen, idCuentaDestino, monto, ... }
  return await request('/api/transacciones', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function realizarTransferenciaInterbancaria(payload) {
  return await request('/api/transacciones', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getBancos() {
  try {
    const response = await request('/api/bancos');
    // Mapear respuesta para compatibilidad con el frontend
    const bancos = response.bancos || [];
    return bancos.map(b => ({
      id: b.codigo || b.id,
      nombre: b.nombre || b.name || b.codigo,
      codigo: b.codigo
    }));
  } catch (e) {
    console.warn("Error cargando bancos del switch:", e);
    return [];
  }
}

export async function crearCuentaWeb(data) {
  // data: { identificacion, password, name, tipoIdentificacion }
  // Endpoint real en micro-clientes: POST /api/v1/clientes
  return await request('/api/v1/clientes', {
    method: 'POST',
    body: JSON.stringify({
      identificacion: data.identificacion,
      tipoIdentificacion: data.tipoIdentificacion || 'CEDULA',
      nombreCompleto: data.name,
      clave: data.password
    })
  });
}

// bancaApi declaration removed from here as it is redefined at bottom

export async function solicitarReverso(idTransaccion, motivo) {
  return await request(`/api/transacciones/${idTransaccion}/devolucion`, {
    method: 'POST',
    body: JSON.stringify({ motivo })
  });
}

export async function getMotivosDevolucion() {
  return await request('/api/transacciones/motivos-devolucion');
}

const bancaApi = {
  getClientePorIdentificacion,
  getCuentaPorNumero,
  getConsolidada,
  getMovimientos,
  realizarTransferencia,
  realizarTransferenciaInterbancaria,
  getBancos,
  crearCuentaWeb,
  solicitarReverso,
  getMotivosDevolucion
}

export default bancaApi;