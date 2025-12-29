# 🏦 Guía de Integración: Arcbank ↔ Switch DIGICONECU (Kong)

## 📋 Resumen Ejecutivo

Esta guía explica cómo **Arcbank** se comunica con el **Switch Interbancario DIGICONECU** a través del **API Manager Kong** para realizar transferencias interbancarias.

---

## 🔑 ¿Qué es una API Key y por qué la necesitamos?

Una **API Key** es un código secreto único que identifica y autentica a tu banco (Arcbank) cuando hace peticiones al Switch.

**Analogía**: Es como tu contraseña o credencial bancaria, pero para sistemas.

### ¿Qué contiene?
- Un **string alfanumérico único** (ejemplo: `ARCBANK_SECRET_KEY_2025_XYZ`)
- Generado por **ustedes** (Arcbank)
- Longitud recomendada: 24-64 caracteres
- Debe ser **impredecible** y **secreto**

---

## 🏗️ Arquitectura de Comunicación

```
┌─────────────────┐
│   ARCBANK       │
│   Frontend      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ms-transaccion  │◄─── Aquí se implementa la API Key
│ (Puerto 4082)   │
└────────┬────────┘
         │
         │ [HTTPS + mTLS]
         │ Header: apikey: ARCBANK_SECRET_KEY_2025_XYZ
         │
         ▼
┌─────────────────────────────────────────┐
│  KONG API GATEWAY (35.208.155.21:9080)  │
│  ┌────────────────────────────────┐     │
│  │  1. Valida API Key             │     │
│  │  2. Verifica Certificado mTLS  │     │
│  │  3. Autoriza al Consumer       │     │
│  └────────────────────────────────┘     │
└───────────────────┬─────────────────────┘
                    │
                    ▼
           ┌────────────────┐
           │ SWITCH         │
           │ DIGICONECU     │
           │ (Core System)  │
           └────────────────┘
```

---

## 🛠️ Paso a Paso: Implementación Completa

### ✅ Paso 1: Generar tu API Key (Ya hecho)

Ya tienes una API Key de ejemplo en tu código:
```
ARCBANK_SECRET_KEY_2025_XYZ
```

**Opcional**: Puedes generar una más segura con este comando (PowerShell):
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

### ✅ Paso 2: Configurar la API Key en tu aplicación (Ya hecho)

Hemos configurado:

**a) `MTLSConfig.java`**: Intercepta todas las peticiones Feign y añade el header `apikey`

**b) `application.yaml`**: Lee la configuración desde variable de entorno
```yaml
app:
  switch:
    apikey: ${APP_SWITCH_APIKEY:}
```

**c) `docker-compose.yml` y `docker-compose.prod.yml`**: Inyecta la variable
```yaml
environment:
  APP_SWITCH_APIKEY: ${APP_SWITCH_APIKEY:-ARCBANK_SECRET_KEY_2025_XYZ}
```

**d) `.env.example`**: Plantilla para configuración segura

### ✅ Paso 3: Registrar la API Key en Kong

**🚨 ESTE ES EL PASO CRÍTICO QUE FALTABA**

Debes ir a la interfaz web de Kong y registrar tu API Key manualmente:

#### 3.1. Acceder a Kong Admin UI
```
URL: http://35.208.155.21:1337
```

#### 3.2. Crear Consumer (Consumidor)
1. Click en **"CONSUMERS"** (menú lateral)
2. Click en **"+ CREATE CONSUMER"**
3. Rellenar:
   - **Username**: `banco-arcbank`
   - **Custom ID**: `ARCBANK`
4. Click en **"CREATE"**

#### 3.3. Añadir API Key al Consumer
1. Dentro del Consumer `banco-arcbank`, ve a la pestaña **"Credentials"**
2. Click en **"+ CREATE API KEY"**
3. Seleccionar plugin: **"API KEYS"**
4. En el campo **"Key"**, escribe:
   ```
   ARCBANK_SECRET_KEY_2025_XYZ
   ```
5. Click en **"SAVE"**

#### 3.4. Verificación
Tu pantalla debe verse como la captura que compartiste del banco Nexus:
```
CONSUMER: banco-arcbank
  Credentials > Api Keys
    ✓ key
    1. ARCBANK_SECRET_KEY_2025_XYZ    Created: Dec 29, 2025
```

---

## 🔍 ¿Cómo saber que el Switch/Kong nos reconoce?

### Test 1: Health Check Manual (Postman/curl)

```bash
curl -X GET http://35.208.155.21:9080/api/v2/transfers/health \
  -H "apikey: ARCBANK_SECRET_KEY_2025_XYZ" \
  -H "Content-Type: application/json"
```

**Respuesta esperada si Kong reconoce tu API Key:**
```json
{
  "status": "UP",
  "timestamp": "2025-12-29T06:40:00Z"
}
```

**Respuesta si la API Key NO está registrada:**
```json
{
  "message": "No API key found in request"
}
```

### Test 2: Desde tu aplicación (logs)

Cuando ejecutes una transferencia interbancaria desde Arcbank:

1. Ve a los logs del contenedor:
```bash
docker logs -f ms-transaccion-arcbank2
```

2. Busca líneas como:
```
DEBUG c.a.c.t.client.SwitchClient : [SwitchClient#enviarTransferencia] ---> POST http://35.208.155.21:9080/api/v2/transfers HTTP/1.1
DEBUG c.a.c.t.client.SwitchClient : apikey: ARCBANK_SECRET_KEY_2025_XYZ
DEBUG c.a.c.t.client.SwitchClient : <--- HTTP/1.1 200 (250ms)
```

3. Si ves **200 OK** → Kong te reconoce ✅
4. Si ves **401 Unauthorized** → API Key incorrecta o no registrada ❌
5. Si ves **403 Forbidden** → API Key válida pero sin permisos ⚠️

---

## 📝 Checklist de Configuración

Antes de hacer una transferencia interbancaria, verifica:

- [ ] **API Key generada**: `ARCBANK_SECRET_KEY_2025_XYZ`
- [ ] **Variable de entorno configurada**: En `.env` o sistema operativo
- [ ] **Consumer creado en Kong**: `banco-arcbank`
- [ ] **API Key registrada en Kong**: Igual a la de tu código
- [ ] **Certificados mTLS presentes**: En `./nginx/certs/`
- [ ] **URL del Switch correcta**: `http://35.208.155.21:9080`
- [ ] **Código del banco configurado**: `ARCBANK`

---

## 🚀 Flujo Completo de una Transferencia Interbancaria

```
1. Usuario en Frontend solicita transferencia
   ↓
2. ms-transaccion construye SwitchTransferRequest
   ↓
3. Feign llama a SwitchClient.enviarTransferencia()
   ↓
4. MTLSConfig.requestInterceptor() añade header:
   "apikey: ARCBANK_SECRET_KEY_2025_XYZ"
   ↓
5. Petición viaja con mTLS a Kong (35.208.155.21:9080)
   ↓
6. Kong valida:
   - ✓ Certificado SSL/TLS válido
   - ✓ API Key existe en Consumer "banco-arcbank"
   - ✓ Consumer tiene permisos para /api/v2/transfers
   ↓
7. Kong reenvía petición al Switch DIGICONECU
   ↓
8. Switch procesa transferencia
   ↓
9. Switch responde a Kong con SwitchTransferResponse
   ↓
10. Kong reenvía respuesta a ms-transaccion
   ↓
11. ms-transaccion actualiza estado en BD
   ↓
12. Frontend recibe confirmación ✅
```

---

## 🔐 Seguridad: Variables de Entorno en Producción

**NUNCA** subas la API Key real a Git. Usa:

```bash
# En el servidor de producción
export APP_SWITCH_APIKEY="tu-clave-real-super-secreta"
```

O en un archivo `.env` (NO versionado):
```bash
APP_SWITCH_APIKEY=ARCBANK_SECRET_KEY_PROD_2025_ABC123XYZ
```

Y asegúrate de que `.env` esté en `.gitignore`.

---

## 📞 Troubleshooting

### Problema: "No API key found in request"
**Solución**: La API Key no se está enviando. Verifica:
- `MTLSConfig` está activo (`@Configuration` descomentado)
- Variable `APP_SWITCH_APIKEY` tiene valor
- Logs muestran el header `apikey` en la petición

### Problema: "Invalid API key"
**Solución**: La API Key en tu código NO coincide con la registrada en Kong.
- Ve a Kong → Consumers → banco-arcbank → Credentials
- Verifica que la key sea exactamente: `ARCBANK_SECRET_KEY_2025_XYZ`

### Problema: "Upstream connect error"
**Solución**: Kong no puede llegar al Switch.
- Verifica que el Switch esté corriendo
- Verifica reglas de firewall entre Kong y Switch

---

## 📚 Archivos Modificados

1. ✅ `MTLSConfig.java` - Interceptor de API Key
2. ✅ `application.yaml` - Configuración de API Key
3. ✅ `docker-compose.yml` - Variable de entorno dev
4. ✅ `docker-compose.prod.yml` - Variable de entorno prod
5. ✅ `.env.example` - Plantilla de configuración

---

## ✨ Siguiente Paso

**Registra tu API Key en Kong AHORA** siguiendo el Paso 3 de esta guía.

Una vez hecho, prueba con el comando curl del Test 1.

Si obtienes `200 OK`, ¡estás listo para hacer transferencias interbancarias! 🎉
