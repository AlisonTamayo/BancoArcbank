# 🔐 Certificados mTLS y Comunicación con el Switch

## ❓ Tus Preguntas Respondidas

### 1. ¿Si activo mTLS (MTLS_ENABLED: true) sin certificados, habrá errores?

**Respuesta: NO habrá bloqueos críticos gracias al fallback implementado.**

#### ¿Qué sucede?

Tu código tiene un **mecanismo de protección robusto** en `MTLSConfig.java` (líneas 59-69):

```java
// FALLBACK ROBUSTO: Si faltan certificados, deshabilitar mTLS para evitar crash
if (!keystoreResource.exists() || !truststoreResource.exists()) {
    log.error("⚠️ [CRITICAL] Certificados mTLS no encontrados. Desactivando mTLS...");
    
    // Retornamos cliente básico para permitir operaciones internas
    return new Client.Default(null, null);
}
```

**Comportamiento paso a paso:**

| Estado | ¿Qué pasa? |
|--------|------------|
| ✅ `MTLS_ENABLED=false` | Usa cliente HTTP básico. **Todo funciona normalmente.** |
| ⚠️ `MTLS_ENABLED=true` + **SIN certificados** | Detecta que faltan archivos → Logs de ERROR → **Fallback a cliente básico** → App funciona |
| ✅ `MTLS_ENABLED=true` + **CON certificados** | Carga keystores → Configura SSL mutuo → **Comunicación segura con mTLS** |

**Conclusión**: 
- ❌ NO habrá crash de la aplicación
- ✅ SÍ habrá logs de error indicando que faltan certificados
- ✅ La app funcionará en modo HTTP simple (suficiente porque Kong valida con API Key)

---

### 2. ¿Se necesita URL/IP del API Manager o Switch para comunicarse?

**Respuesta: SÍ, ya está configurada.**

#### Configuración actual:

**En `application.yaml` (líneas 40-43):**
```yaml
app:
  switch:
    url: ${APP_SWITCH_URL:http://35.208.155.21:9080}
    network-url: ${APP_SWITCH_URL:http://35.208.155.21:9080}
    apikey: ${APP_SWITCH_APIKEY:}
```

**En `SwitchClient.java` (línea 15):**
```java
@FeignClient(
    name = "digiconecu-switch", 
    url = "${app.switch.url:http://localhost:8081}",
    configuration = MTLSConfig.class
)
```

**¿Qué hace?**
1. Lee la URL desde la variable de entorno `APP_SWITCH_URL`
2. Si no existe, usa el valor por defecto (`http://35.208.155.21:9080`)
3. Todas las peticiones van a esa dirección (Kong API Gateway)

**Para cambiar la URL en producción:**
```yaml
# En docker-compose.prod.yml
environment:
  APP_SWITCH_URL: http://35.208.155.21:9080  # Kong Gateway
```

---

### 3. ¿Se necesita información de otros bancos para tranferencias?

**Respuesta: SÍ, pero el Switch proporciona esa información, no ustedes.**

#### Flujo de información:

```
┌─────────────────┐
│   Tu Frontend   │
│   (React/Vue)   │
└────────┬────────┘
         │
         │ GET /api/bancos
         ▼
┌─────────────────────────┐
│  ms-transaccion         │
│  BancosController.java  │
└────────┬────────────────┘
         │
         │ GET /api/v1/red/bancos
         │ Header: apikey: ARCBANK_...
         ▼
┌─────────────────────────┐
│  Kong API Gateway       │
│  35.208.155.21:9080     │
└────────┬────────────────┘
         │
         │ (valida API Key)
         ▼
┌─────────────────────────┐
│  Switch DIGICONECU      │
│  Network Management     │
└────────┬────────────────┘
         │
         │ Respuesta JSON
         ▼
[
  {"codigo": "ARCBANK", "nombre": "Banco Arcbank", "activo": true},
  {"codigo": "NEXUS", "nombre": "Banco Nexus", "activo": true},
  {"codigo": "PICHINCHA", "nombre": "Banco Pichincha", "activo": true}
]
```

---

### 4. ¿Cómo cargar los bancos en el frontend?

**Ya está implementado en `BancosController.java`** ✅

#### Endpoint disponible:

```http
GET http://localhost:4082/api/bancos
```

**Respuesta esperada:**
```json
{
  "bancos": [
    {
      "codigo": "NEXUS",
      "nombre": "Banco Nexus",
      "activo": true,
      "participantId": "banco-nexus",
      "bic": "NEXUSEC"
    },
    {
      "codigo": "PICHINCHA",
      "nombre": "Banco Pichincha",
      "activo": true,
      "participantId": "banco-pichincha",
      "bic": "PICHEC"
    }
  ],
  "total": 2
}
```

**Nota:** El controller ya filtra automáticamente para **excluir "ARCBANK"** (línea 55):
```java
.filter(b -> !"ARCBANK".equals(b.get("codigo")))
```

---

## 🏗️ Implementación en Frontend

### React/Vue - Cargar bancos externos

```javascript
// service/bancosService.js
export const obtenerBancosExternos = async () => {
  const response = await fetch('http://localhost:4082/api/bancos');
  const data = await response.json();
  return data.bancos;
};

// En tu componente de transferencia
useEffect(() => {
  obtenerBancosExternos().then(setBancos);
}, []);

// Renderizar dropdown
<select>
  {bancos.map(banco => (
    <option key={banco.codigo} value={banco.codigo}>
      {banco.nombre}
    </option>
  ))}
</select>
```

---

## 🔑 Resumen de Configuración Necesaria

### Para comunicarte con el Switch necesitas:

1. **✅ URL del Switch** (Ya configurada)
   ```
   APP_SWITCH_URL=http://3.140.230.212:8000
   ```

2. **✅ API Key generada por tu banco** (Ya implementada)
   ```
   APP_SWITCH_APIKEY=ARCBANK_SECRET_KEY_2025_XYZ
   ```

3. **⚠️ API Key registrada en Kong** (DEBES HACER MANUALMENTE)
   - Ve a Kong Admin: `http://3.140.230.212:8000`
   - Crea Consumer: `banco-arcbank`
   - Añade Credential: `ARCBANK_SECRET_KEY_2025_XYZ`

4. **⚠️ Certificados mTLS** (OPCIONAL pero recomendado)
   - **Si NO los tienes**: La app funciona igual (fallback a HTTP + API Key)
   - **Si los tienes**: Mayor seguridad con doble autenticación
   - Ubicación: `./nginx/certs/arcbank-keystore.p12`
   
---

## 🚀 Siguiente Paso

**Acción inmediata:**
1. Registra tu API Key en Kong (ver `KONG_API_KEY_GUIDE.md`)
2. Prueba el endpoint de salud:
   ```bash
   curl http://35.208.155.21:9080/api/v2/transfers/health \
     -H "apikey: ARCBANK_SECRET_KEY_2025_XYZ"
   ```
3. Si obtienes `200 OK`, prueba listar bancos:
   ```bash
   curl http://localhost:4082/api/bancos
   ```

**¿Listo para hacer tu primera transferencia interbancaria?** 🏦💸
