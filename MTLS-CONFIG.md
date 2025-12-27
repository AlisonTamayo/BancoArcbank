# Configuración mTLS para ArcBank → DIGICONECU Switch

## 📋 Resumen

Este documento explica cómo configurar la autenticación mutua TLS (mTLS) entre ArcBank y el Switch DIGICONECU para transferencias interbancarias seguras.

## 🔑 Componentes de Seguridad

### 1. KeyStore (`arcbank.p12`)
- **Contenido**: Certificado público + llave privada de ArcBank
- **Propósito**: Identidad del banco ante el Switch
- **Formato**: PKCS12
- **Ubicación en producción**: `/app/certs/arcbank.p12` dentro del contenedor

### 2. TrustStore (`truststore.p12`)
- **Contenido**: Certificados de autoridades confiables (CA) y certificado del Switch
- **Propósito**: Validar que el Switch es quien dice ser
- **Formato**: PKCS12
- **Ubicación en producción**: `/app/certs/truststore.p12` dentro del contenedor

## 🚀 Instalación en VM de Producción

### Pre-requisitos
1. Acceso SSH a `vmarcbank` (35.209.79.193)
2. Git instalado
3. Docker y Docker Compose instalados

### Paso 1: Clonar el repositorio
```bash
cd ~
git clone https://github.com/AlisonTamayo/BancoArcbank.git
cd BancoArcbank
```

### Paso 2: Generar certificados
```bash
# Crear directorio de seguridad
mkdir -p ~/seguridad && cd ~/seguridad

# Generar llave privada y certificado (válido por 1 año)
openssl req -new -x509 -nodes -newkey rsa:2048 \
  -keyout arcbank.key \
  -out arcbank.crt \
  -days 365 \
  -subj "/C=EC/ST=Pichincha/L=Quito/O=ArcBank/CN=arcbank.switch.com"
```

### Paso 3: Ejecutar script de configuración
```bash
cd ~/BancoArcbank
chmod +x setup-mtls.sh
./setup-mtls.sh
```

Este script:
- ✅ Convierte certificados a formato PKCS12
- ✅ Crea TrustStore con certificados del Switch
- ✅ Copia archivos al directorio del proyecto
- ✅ Configura permisos seguros
- ✅ Verifica la configuración

### Paso 4: Levantar servicios
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

## 🔍 Verificación

### Verificar que los certificados están montados
```bash
docker exec ms-transaccion-arcbank2 ls -la /app/certs/
```

Deberías ver:
```
arcbank.p12
truststore.p12
arcbank.crt
arcbank.key
```

### Verificar logs del servicio
```bash
docker logs ms-transaccion-arcbank2 | grep SSL
```

Deberías ver:
```
✓ KeyStore cargado desde: file:/app/certs/arcbank.p12
✓ TrustStore cargado desde: file:/app/certs/truststore.p12
✅ Cliente Feign con mTLS configurado correctamente
```

### Probar conexión con el Switch
```bash
# Desde dentro del contenedor
docker exec ms-transaccion-arcbank2 curl -v http://35.208.155.21:9080/api/v1/red/bancos
```

## 🔧 Configuración Detallada

### Variables de Entorno (docker-compose.prod.yml)
```yaml
environment:
  SSL_ENABLED: "true"
  SSL_KEYSTORE_PATH: "file:/app/certs/arcbank.p12"
  SSL_KEYSTORE_PASSWORD: "changeit"
  SSL_TRUSTSTORE_PATH: "file:/app/certs/truststore.p12"
  SSL_TRUSTSTORE_PASSWORD: "changeit"
```

### Montaje de Volúmenes
```yaml
volumes:
  - ./ms-transaccion/certs:/app/certs:ro
```
**Nota**: `:ro` = read-only para mayor seguridad

## 🔐 Seguridad en Producción

### ⚠️ IMPORTANTE: Passwords
En este ejemplo usamos `changeit` como contraseña. **Para producción real**, debes:

1. Generar contraseñas seguras:
```bash
openssl rand -base64 32
```

2. Almacenarlas en secretos (nunca en el código):
```bash
# Usar Docker Secrets o variables de entorno del sistema
export SSL_KEYSTORE_PASSWORD="tu-password-seguro"
export SSL_TRUSTSTORE_PASSWORD="otro-password-seguro"
```

### 📝 Registro de Certificado en el Switch

El certificado `arcbank.crt` debe ser enviado al administrador del Switch DIGICONECU para:
1. Registrar a ArcBank como banco autorizado
2. Permitir conexiones desde la IP de ArcBank (35.209.79.193)

**Para enviar el certificado:**
```bash
# Ver contenido del certificado
cat ~/seguridad/arcbank.crt

# O enviarlo por email
cat ~/seguridad/arcbank.crt | base64
```

## 🛠️ Troubleshooting

### Error: "SSL handshake failed"
**Causa**: El Switch no reconoce el certificado de ArcBank
**Solución**: Verificar que el certificado fue registrado en el Switch

### Error: "Certificate expired"
**Causa**: El certificado tiene más de 365 días
**Solución**: Regenerar certificado y actualizar en el Switch

### Error: "KeyStore not found"
**Causa**: El script setup-mtls.sh no se ejecutó correctamente
**Solución**: Ejecutar nuevamente el script y verificar los logs

## 📚 Arquitectura del Sistema

```
┌──────────────────┐     mTLS HTTPS      ┌──────────────────────┐
│   ARCBANK        │ ──────────────────► │  DIGICONECU SWITCH   │
│  ms-transaccion  │                     │   35.208.155.21      │
│                  │ ◄────────────────── │                      │
│  Cert: arcbank   │     Webhook         │  Cert: digiconecu    │
└──────────────────┘                     └──────────────────────┘
        ▲
        │ Valida con
        │ truststore.p12
        ▼
┌──────────────────┐
│   TrustStore     │
│  (CAs + Switch)  │
└──────────────────┘
```

## 📞 Soporte

- **Repositorio**: https://github.com/AlisonTamayo/BancoArcbank.git
- **Switch**: DIGICONECU (35.208.155.21:9080)
- **Documentación API**: http://35.209.79.193:4080/swagger-ui.html

---

**Última actualización**: 26 de Diciembre, 2025
