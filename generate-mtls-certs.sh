#!/bin/bash
set -e

# Moverse al directorio del script (raíz del proyecto)
cd "$(dirname "$0")"

CERTS_DIR="ms-transaccion/src/main/resources/certs"

# ============================================================
# Verificar si los certificados ya existen
# ============================================================
# ============================================================
# Verificar si los certificados ya existen
# ============================================================
if [ -f "$CERTS_DIR/arcbank-keystore.p12" ] && \
   [ -f "$CERTS_DIR/arcbank-truststore.p12" ] && \
   [ -f "$CERTS_DIR/arcbank-public-key.pem" ]; then
  echo "✅ Todos los certificados y llaves (incluyendo JWS) ya existen en $CERTS_DIR"
  echo "   No es necesario regenerarlos."
  echo ""
  echo "🔍 Certificados encontrados:"
  ls -lh "$CERTS_DIR"
  exit 0
fi

echo "🐳 Usando Docker para generar certificados (evita errores de librerías en Host)..."

# Usamos una imagen ligera de Java que permite instalar OpenSSL
# Montamos el directorio actual ($PWD) en /work dentro del contenedor
# Nota: Usamos 'sudo' porque en la VM parece ser necesario para docker
sudo docker run --rm -v "$(pwd):/work" -w /work eclipse-temurin:17-jdk-alpine sh -c '
  set -e # Detener script si falla cualquier comando openssl
  # Instalar OpenSSL
  apk add --no-cache openssl > /dev/null
  
  echo "🔐 Generando certificados..."
  mkdir -p ms-transaccion/src/main/resources/certs
  cd ms-transaccion/src/main/resources/certs
  
  # Variables
  KEYSTORE_PASSWORD="arcbank123"
  TRUSTSTORE_PASSWORD="arcbank123"

  # 1. Generar Llave y Certificado
  echo "  -> Generando arcbank.crt y arcbank.key..."
  openssl req -new -x509 -nodes -newkey rsa:2048 \
    -keyout arcbank.key \
    -out arcbank.crt \
    -days 365 \
    -subj "/C=EC/ST=Pichincha/L=Quito/O=Arcbank/CN=arcbank.switch.com"

  # 2. Keystore PKCS12
  echo "  -> Generando arcbank-keystore.p12..."
  openssl pkcs12 -export \
    -in arcbank.crt \
    -inkey arcbank.key \
    -out arcbank-keystore.p12 \
    -name arcbank \
    -password pass:$KEYSTORE_PASSWORD

  # 3. Truststore
  echo "  -> Generando arcbank-truststore.p12..."
  keytool -genkeypair -alias dummy -keyalg RSA -keysize 2048 \
    -keystore arcbank-truststore.p12 \
    -storetype PKCS12 \
    -storepass $TRUSTSTORE_PASSWORD \
    -dname "CN=Dummy, OU=Dummy, O=Dummy, L=Dummy, ST=Dummy, C=EC" \
    -validity 1

  keytool -delete -alias dummy \
    -keystore arcbank-truststore.p12 \
    -storepass $TRUSTSTORE_PASSWORD
  
  # 4. Crear certificado público para entregar al Switch
  echo "  -> Generando arcbank-public-cert.pem (para entregar al Switch)..."
  cat > arcbank-public-cert.pem <<EOF
# ============================================================
# CERTIFICADO PÚBLICO DE ARCBANK
# ============================================================
# Este archivo debe ser entregado al administrador del 
# Switch DIGICONECU para registrar a Arcbank en la red
# ============================================================
# 
# Consumer: banco-arcbank
# Código: ARCBANK
# Certificado válido por 365 días
#
# ============================================================

EOF
  cat arcbank.crt >> arcbank-public-cert.pem
  
  # 5. Extraer Llave Pública RSA (para JWS)
  echo "  -> Generando arcbank-public-key.pem (para JWS/RS256)..."
  openssl rsa -in arcbank.key -pubout -out arcbank-public-key.pem

  # Ajustar permisos para que el usuario del host pueda leerlos
  chmod 644 *
  chmod 600 arcbank.key
'

echo "✅ Certificados generados exitosamente en $CERTS_DIR"
echo ""
echo "📄 Archivos generados:"
echo "   - arcbank.key              (Clave privada - NO compartir)"
echo "   - arcbank.crt              (Certificado público)"
echo "   - arcbank-keystore.p12     (Para la aplicación Java)"
echo "   - arcbank-truststore.p12   (Para verificar certificados)"
echo "   - arcbank-public-cert.pem  (📤 ENTREGAR AL SWITCH - mTLS)"
echo "   - arcbank-public-key.pem   (📤 ENTREGAR AL SWITCH - JWS)"
echo ""
echo "🔐 Contraseñas de los Keystores: arcbank123"
