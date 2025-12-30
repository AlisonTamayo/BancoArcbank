# Configuración de Firewall - Google Cloud Platform
# Para la VM: vmarcbank (35.208.155.21

## Puertos que deben estar ABIERTOS en el firewall de GCP

### 1. Frontends (Usuarios Finales)
- **Puerto 80 (HTTP)**: Redirección a HTTPS
- **Puerto 443 (HTTPS)**: Banca Web (vía Nginx)
- **Puerto 8443 (HTTPS)**: Cajero ATM (vía Nginx)

### 2. API Gateway (Switch y API Manager)
- **Puerto 4080 (HTTP)**: 
  - Recepción de webhooks del Switch DIGICONECU
  - Acceso al API Manager para importar documentación
  - Swagger UI centralizado: `http://35.208.155.21r-ui.html`

### 3. Microservicios (OPCIONAL - Solo para Debug)
- Puerto 4081: Micro Cuentas (directo)
- Puerto 4082: MS Transacción (directo)  
- Puerto 4083: Micro Clientes (directo)

**RECOMENDACIÓN**: En producción, NO exponer los puertos de microservicios individuales. Todo debe pasar por el Gateway (4080) para mayor seguridad.

---
## Verificación de Configuración

### 1. Verificar que los puertos están abiertos
```bash
# Desde tu máquina local, probar conectividad
telnet 35.208.155.21
telnet 35.208.155.21
```

### 2. Verificar reglas de firewall activas
```bash
gcloud compute firewall-rules list --filter="targetTags:arcbank-vm"
```

### 3. Probar webhook desde el Switch
```bash
# El Switch enviará webhooks a esta URL:
curl -X POST http://35.208.155.21ansacciones/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "instructionId": "test-123",
    "cuentaDestino": "2201234567",
    "monto": 100.00,
    "bancoOrigen": "TESTBANK",
    "estado": "Completada"
  }'
```

---

## Arquitectura de Red - Puertos

```
                    INTERNET
                        │
        ┌───────────────┼───────────────┐
        │               │               │
    Puerto 443      Puerto 8443    Puerto 4080
  (Banca Web)      (Cajero ATM)   (API Gateway)
        │               │               │
        └───────────────┴───────────────┘
                        │
                  ┌─────▼─────┐
                  │   NGINX   │
                  │  (Proxy)  │
                  └─────┬─────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
    Frontend Web   Frontend Cajero   API Gateway
        │               │           (4080:8080)
        │               │               │
        │               │               ▼
        │               │       ┌───────────────┐
        │               │       │  Microservicios│
        │               │       ├───────────────┤
        └───────────────┴──────►│  • Clientes   │
                                │  • Cuentas    │
                                │  • Transacc.  │
                                └───────────────┘
                                        ▲
                                        │
                                Comunicación
                                 Interna
                                 (Docker)
```

---

## Información para el Administrador del Switch

Cuando envíes el certificado `arcbank.crt` al administrador del Switch DIGICONECU, incluye esta información:

**Datos de Conexión de ArcBank:**
- **IP Pública**: 35.208.155.21
- **Puerto Webhook**: 4080
- **URL Webhook Completa**: `http://35.208.155.21:4080/api/transacciones/webhook`
- **Código Banco**: ARCBANK
- **Certificado**: (adjuntar arcbank.crt)

**Credenciales (si aplica):**
- Las transferencias usan el certificado mTLS como autenticación
- No se requieren API keys adicionales

---

**Última actualización**: 29 de Diciembre, 2025
