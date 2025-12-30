# ✅ Configuración de Webhook para ARCBANK

## 🎯 URL Correcta del Webhook

La URL que el **administrador del Switch DIGICONECU** debe registrar en la tabla `INSTITUCION` es:

```
http://35.208.155.21:4080/api/transacciones/webhook
```

---

## 📊 Desglose de la URL

```
http://35.208.155.21:4080/api/transacciones/webhook
       └─────┬──────┘ └┬┘ └───────────┬─────────────┘
             │         │              └─ Endpoint del WebhookController
             │         └─ Puerto del API Gateway (expuesto en Docker)
             └─ IP pública de la VM de ARCBANK
```

---

## 🔍 Verificaciones en tu Infraestructura

### 1. ✅ Puerto 4080 Expuesto

**docker-compose.prod.yml (línea 43)**:
```yaml
api-gateway-arcbank:
  ports:
    - "4080:8080"  # Puerto expuesto para webhooks del Switch
```

**Estado:** ✅ Correcto

---

### 2. ✅ WebhookController Implementado

**Archivo:** `ms-transaccion/src/main/java/com/arcbank/cbs/transaccion/controller/WebhookController.java`

**Endpoint:**
```java
@RestController
@RequestMapping("/api/transacciones/webhook")
public class WebhookController {
    
    @PostMapping
    public ResponseEntity<?> recibirTransferenciaEntrante(@RequestBody SwitchTransferRequest payload) {
        // Procesa transferencias entrantes del Switch
    }
}
```

**Estado:** ✅ Correcto

---

### 3. ✅ Routing del API Gateway

**Archivo:** `api-gateway/src/main/java/com/arcbank/api_gateway/ApiGatewayApplication.java`

El API Gateway enruta `/api/transacciones/**` hacia `ms-transaccion-arcbank:8080`

**Estado:** ✅ Correcto

---

## 🌐 Flujo de Petición Webhook

```
┌──────────────────────────────────────────────────────────┐
│ Switch DIGICONECU (35.208.155.21)                        │
│ Envía POST a:                                            │
│ http://35.208.155.21:4080/api/transacciones/webhook      │
└────────────────────────┬─────────────────────────────────┘
                         │
                         │ Internet
                         ▼
┌──────────────────────────────────────────────────────────┐
│ VM ARCBANK (35.208.155.21)                               │
│                                                          │
│ Puerto 4080 (Docker expuesto) →                          │
│   api-gateway-arcbank:8080 →                             │
│     /api/transacciones/webhook →                         │
│       ms-transaccion-arcbank:8080/api/transacciones/     │
│         webhook                                          │
│                                                          │
│ ┌────────────────────────────────────┐                   │
│ │ WebhookController                  │                   │
│ │ - Recibe SwitchTransferRequest     │                   │
│ │ - Extrae creditor.accountId        │                   │
│ │ - Extrae amount.value              │                   │
│ │ - Acredita cuenta destino          │                   │
│ │ - Retorna {status: "ACK"}          │                   │
│ └────────────────────────────────────┘                   │
└──────────────────────────────────────────────────────────┘
```

---

## 🧪 Probar el Webhook Localmente

### Desde el Switch o cualquier máquina externa:

```bash
curl -X POST http://35.208.155.21:4080/api/transacciones/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "header": {
      "messageId": "TEST-123",
      "creationDateTime": "2025-12-29T03:00:00-05:00",
      "originatingBankId": "NEXUS_BANK"
    },
    "body": {
      "instructionId": "test-uuid-123",
      "amount": {
        "currency": "USD",
        "value": 50.00
      },
      "creditor": {
        "accountId": "400000123456"
      }
    }
  }'
```

**Respuesta esperada (si la cuenta existe):**
```json
{
  "status": "ACK",
  "message": "Transferencia procesada exitosamente",
  "instructionId": "test-uuid-123"
}
```

**Respuesta si la cuenta no existe:**
```json
{
  "status": "NACK",
  "error": "Cuenta destino no encontrada en ARCBANK: 400000123456"
}
```

---

## 🔥 Firewall: Asegurar que el Switch Pueda Acceder

### Regla de Firewall GCP

Si usas Google Cloud, debes permitir tráfico entrante en el puerto **4080**:

```bash
# Permitir tráfico desde la IP del Switch
gcloud compute firewall-rules create allow-webhook-from-switch \
  --project=tu-proyecto \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:4080 \
  --source-ranges=35.208.155.21/32 \
  --target-tags=arcbank-vm
```

**O permitir desde cualquier IP (menos seguro):**
```bash
gcloud compute firewall-rules create allow-webhook-public \
  --project=tu-proyecto \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:4080 \
  --source-ranges=0.0.0.0/0
```

---

## 📋 Información para el Administrador del Switch

**Envía este mensaje:**

```
Asunto: URL de Webhook para ARCBANK

Hola,

Por favor registrar la siguiente información en la tabla INSTITUCION del Switch DIGICONECU:

Código BIC: ARCBANK
Nombre: Banco Arcbank
URL del Webhook: http://35.208.155.21:4080/api/transacciones/webhook
Estado Operativo: ONLINE
Prefijo BIN: 400000

El webhook está activo y listo para recibir transferencias entrantes.

Para pruebas, pueden enviar un POST con el formato ISO 20022 a la URL indicada.

Saludos,
Equipo Arcbank
```

---

## ✅ Checklist Final

- [x] **Puerto 4080 expuesto** en docker-compose.prod.yml
- [x] **WebhookController implementado** en `/api/transacciones/webhook`
- [x] **API Gateway** enruta correctamente a ms-transaccion
- [ ] **Firewall configurado** para permitir tráfico en puerto 4080
- [ ] **URL informada al Switch**: `http://35.208.155.21:4080/api/transacciones/webhook`
- [ ] **Prueba de conectividad** desde el Switch (curl)

---

## 🚨 Errores Comunes

### Error: "Connection refused"
**Causa:** El Switch no puede acceder al puerto 4080
**Solución:** Verificar reglas de firewall en la VM

### Error: "404 Not Found"
**Causa:** La ruta del webhook no existe
**Solución:** Verificar que ms-transaccion esté corriendo:
```bash
docker ps | grep ms-transaccion
docker logs ms-transaccion-arcbank2
```

### Error: "Account not found"
**Causa:** La cuenta destino no existe en ARCBANK
**Solución:** Crear la cuenta con prefijo `400000` o usar una existente

---

## 🎯 Próximo Paso

1. **Verificar que el puerto 4080 esté abierto:**
   ```bash
   curl http://35.208.155.21:4080/api/transacciones/health
   ```

2. **Informar al administrador del Switch** la URL correcta

3. **Solicitar una prueba de transferencia** desde otro banco hacia una cuenta ARCBANK (ej: `400000123456`)

¿Todo claro? 🚀
