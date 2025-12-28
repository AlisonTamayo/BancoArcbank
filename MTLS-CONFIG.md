# Configuración mTLS para ArcBank → DIGICONECU Switch

## 📋 Resumen

Este documento explica cómo configurar la autenticación mutua TLS (mTLS) entre ArcBank y el Switch DIGICONECU para transferencias interbancarias seguras.

## 🔑 Componentes de Seguridad

### 1. KeyStore (`arcbank-keystore.p12`)
- **Contenido**: Certificado público + llave privada de ArcBank
- **Propósito**: Identidad de ArcBank ante el Switch
- **Formato**: PKCS12
- **Password**: `arcbank123`
- **Ubicación en producción**: `/app/certs/arcbank-keystore.p12` dentro del contenedor

### 2. TrustStore (`arcbank-truststore.p12`)
- **Contenido**: Certificados de autoridades confiables (CA) y certificado del Switch
- **Propósito**: Validar que el Switch es quien dice ser
- **Formato**: PKCS12
- **Password**: `arcbank123`
- **Ubicación en producción**: `/app/certs/arcbank-truststore.p12` dentro del contenedor

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

### Paso 2: Generar certificados de ArcBank
```bash
# Crear directorio de seguridad
mkdir -p ~/seguridad && cd ~/seguridad

# Generar llave privada y certificado (válido por 1 año)
openssl req -new -x509 -nodes -newkey rsa:2048 \
  -keyout arcbank.key \
  -out arcbank.crt \
  -days 365 \
  -subj "/C=EC/ST=Pichincha/L=Quito/O=Arcbank/CN=arcbank.switch.com"
```

### Paso 3: Ejecutar script de configuración
```bash
cd ~/BancoArcbank
chmod +x setup-mtls.sh
./setup-mtls.sh
```

Este script:
- ✅ Convierte certificados a formato PKCS12 con password `arcbank123`
- ✅ Crea TrustStore con certificados del Switch
- ✅ Copia archivos al directorio `nginx/certs` del proyecto
- ✅ Configura permisos seguros

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
arcbank-keystore.p12
arcbank-truststore.p12
arcbank.crt
arcbank.key
```

### Verificar logs del servicio
```bash
docker logs ms-transaccion-arcbank2 | grep mTLS
```

Deberías ver la confirmación de carga de certificados y configuración de Feign.

### Probar conexión con el Switch
```bash
# Desde dentro del contenedor
docker exec ms-transaccion-arcbank2 curl -v https://35.208.155.21:9080/api/v1/red/bancos
```

## 🔧 Configuración Detallada

### Variables de Entorno (docker-compose.prod.yml)
```yaml
environment:
  MTLS_ENABLED: "true"
  MTLS_KEYSTORE_PATH: "file:/app/certs/arcbank-keystore.p12"
  MTLS_KEYSTORE_PASSWORD: "arcbank123"
  MTLS_TRUSTSTORE_PATH: "file:/app/certs/arcbank-truststore.p12"
  MTLS_TRUSTSTORE_PASSWORD: "arcbank123"
```

### Montaje de Volúmenes (docker-compose.prod.yml)
```yaml
volumes:
  - ./nginx/certs:/app/certs:ro
```

## 🔐 Registro de Certificado en el Switch

El certificado `arcbank.crt` debe ser enviado al administrador del Switch DIGICONECU para:
1. Registrar a ArcBank como banco autorizado
2. Permitir conexiones desde la IP de ArcBank (35.209.79.193)

---

**Última actualización**: 27 de Diciembre, 2025
