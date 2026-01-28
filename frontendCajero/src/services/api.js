// API Gateway via nginx proxy (rutas relativas)
// nginx hace proxy de /api/* hacia api-gateway:8080
const BASE_URL = "";

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  console.log("🌐 Request a:", url);

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  console.log("📡 Response status:", res.status, res.ok);

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    // Intentamos obtener el mensaje limpio del backend (BusinessException)
    const message = errorJson ? (errorJson.mensaje || errorJson.error) : res.statusText;
    console.error("❌ Error response:", message);
    throw new Error(message || "Error del servidor");
  }

  return res.status === 204 ? null : res.json();
}

// Microservicio Clientes (Asumiendo ruta estándar)
export const clientes = {
  getByCedula: (cedula) => request(`/api/v1/clientes/identificacion/${cedula}`),
  getById: (id) => request(`/api/v1/clientes/${id}`),
};

export const auth = {
  login: (identificacion, clave) =>
    request("/api/v1/clientes/login", {
      method: "POST",
      body: JSON.stringify({ identificacion, clave }),
    }),
};

// Microservicio Cuentas
export const cuentas = {
  // Busca por el String del número de cuenta (usa el endpoint nuevo del controller)
  getByNumeroCuenta: (numero) => request(`/api/v1/cuentas/ahorros/buscar/${numero}`),

  getById: (id) => request(`/api/v1/cuentas/ahorros/${id}`),

  // Lógica híbrida del Front
  // Lógica híbrida del Front
  getCuenta: async (identificador) => {
    console.log("🔧 getCuenta llamado con:", identificador);

    // ESTRATEGIA: Intentar primero buscar como CUENTA (prioridad).
    try {
      console.log("📋 Intentando buscar como número de cuenta en MS-Cuentas...");
      return await request(`/api/v1/cuentas/ahorros/buscar/${identificador}`);
    } catch (error) {
      // Si falla (404), intentamos buscar como CLIENTE (por Cédula)
      const msg = error.message || "";
      if (msg.includes("404") || msg.includes("no encontrada")) {
        console.log("⚠️ No es cuenta, intentando como Cédula en MS-Clientes...");

        // 1. Buscamos el cliente
        const cliente = await request(`/api/v1/clientes/identificacion/${identificador}`);

        // 2. Si existe el cliente, buscamos sus cuentas manualmente (Simulacion Consolidada)
        if (cliente && cliente.idCliente) {
          console.log("✅ Cliente encontrado:", cliente.nombreCompleto, "ID:", cliente.idCliente);
          const todasLasCuentas = await request('/api/v1/cuentas/ahorros');

          // 3. Filtramos
          const cuentaDelCliente = todasLasCuentas.find(c => c.idCliente === cliente.idCliente);

          if (cuentaDelCliente) {
            console.log("💰 Cuenta encontrada para el cliente:", cuentaDelCliente.numeroCuenta);
            return cuentaDelCliente;
          } else {
            throw new Error(`El cliente ${cliente.nombreCompleto} no tiene cuentas activas.`);
          }
        }
      }
      // Si falla todo, lanzamos error
      throw error;
    }
  }
};

// Microservicio Transacciones
export const transacciones = {
  // Unificamos retiro y deposito porque el backend usa un solo endpoint POST /api/transacciones
  // El frontend (ValoresTransaccion/Deposito) debe armar el body con "tipoOperacion": "RETIRO" o "DEPOSITO"
  crear: (body) =>
    request("/api/transacciones", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Mantenemos alias por compatibilidad si tu código viejo los llama,
  // pero internamente usan el mismo endpoint.
  retiro: (body) =>
    request("/api/transacciones", {
      method: "POST",
      body: JSON.stringify({ ...body, tipoOperacion: "RETIRO" }),
    }),

  deposito: (body) =>
    request("/api/transacciones", {
      method: "POST",
      body: JSON.stringify({ ...body, tipoOperacion: "DEPOSITO" }),
    }),

  // NUEVOS METODOS PARA DEVOLUCIONES
  getPorCuenta: (idCuenta) => request(`/api/transacciones/cuenta/${idCuenta}`),

  solicitarReverso: (idTransaccion, motivo) =>
    request(`/api/transacciones/${idTransaccion}/devolucion`, {
      method: 'POST',
      body: JSON.stringify({ motivo })
    }),

  getMotivosDevolucion: () => request('/api/transacciones/motivos-devolucion'),
};
