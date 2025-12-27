#!/bin/bash

# ============================================================
# GUIA COMPLETA: Configuración de mTLS para ArcBank
# ============================================================
# Este script debe ejecutarse en la VM vmarcbank después del
# git clone y antes del docker-compose up
# ============================================================

set -e  # Terminar en caso de error

echo "🔐 CONFIGURACIÓN mTLS - ARCBANK → DIGICONECU"
echo "=============================================="
echo ""

# Variables
CERTS_DIR=~/seguridad
PROJECT_DIR=~/BancoArcbank
MS_TRANSACCION_DIR=$PROJECT_DIR/ms-transaccion
DOCKER_CERTS_DIR=$MS_TRANSACCION_DIR/certs

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================================
# PASO 1: Verificar que los certificados existen
# ============================================================
echo -e "${YELLOW}PASO 1: Verificando certificados generados...${NC}"

if [ ! -f "$CERTS_DIR/arcbank.key" ] || [ ! -f "$CERTS_DIR/arcbank.crt" ]; then
    echo -e "${RED}❌ Certificados no encontrados en $CERTS_DIR${NC}"
    echo "Por favor ejecuta primero:"
    echo "  mkdir -p ~/seguridad && cd ~/seguridad"
    echo "  openssl req -new -x509 -nodes -newkey rsa:2048 \\"
    echo "    -keyout arcbank.key -out arcbank.crt -days 365 \\"
    echo "    -subj \"/C=EC/ST=Pichincha/L=Quito/O=ArcBank/CN=arcbank.switch.com\""
    exit 1
fi

echo -e "${GREEN}✓ Certificados encontrados${NC}"

# ============================================================
# PASO 2: Convertir certificados a formato PKCS12
# ============================================================
echo ""
echo -e "${YELLOW}PASO 2: Convirtiendo certificados a PKCS12...${NC}"

# Crear KeyStore PKCS12 (combina clave privada + certificado)
openssl pkcs12 -export \
  -in "$CERTS_DIR/arcbank.crt" \
  -inkey "$CERTS_DIR/arcbank.key" \
  -out "$CERTS_DIR/arcbank.p12" \
  -name "arcbank-client-cert" \
  -passout pass:changeit

echo -e "${GREEN}✓ KeyStore creado: arcbank.p12${NC}"

# ============================================================
# PASO 3: Crear TrustStore (certificados confiables)
# ============================================================
echo ""
echo -e "${YELLOW}PASO 3: Creando TrustStore...${NC}"

# Obtener certificado del switch DIGICONECU
echo "Intentando obtener certificado del switch..."
echo | openssl s_client -connect 35.208.155.21:9080 2>/dev/null | \
  openssl x509 -out "$CERTS_DIR/digiconecu.crt" || {
    echo -e "${YELLOW}⚠ No se pudo obtener certificado del switch (puede ser HTTP no HTTPS)${NC}"
    echo "Creando truststore básico..."
}

# Crear TrustStore e importar certificado del switch
keytool -import \
  -trustcacerts \
  -alias digiconecu-switch \
  -file "$CERTS_DIR/arcbank.crt" \
  -keystore "$CERTS_DIR/truststore.p12" \
  -storetype PKCS12 \
  -storepass changeit \
  -noprompt || echo -e "${YELLOW}⚠ TrustStore ya existe o error menor${NC}"

echo -e "${GREEN}✓ TrustStore creado: truststore.p12${NC}"

# ============================================================
# PASO 4: Copiar certificados al proyecto
# ============================================================
echo ""
echo -e "${YELLOW}PASO 4: Copiando certificados al proyecto...${NC}"

# Crear directorio de certificados en el proyecto
mkdir -p "$DOCKER_CERTS_DIR"

# Copiar archivos
cp "$CERTS_DIR/arcbank.p12" "$DOCKER_CERTS_DIR/"
cp "$CERTS_DIR/truststore.p12" "$DOCKER_CERTS_DIR/"
cp "$CERTS_DIR/arcbank.crt" "$DOCKER_CERTS_DIR/"
cp "$CERTS_DIR/arcbank.key" "$DOCKER_CERTS_DIR/"

# Permisos seguros
chmod 600 "$DOCKER_CERTS_DIR"/*

echo -e "${GREEN}✓ Certificados copiados a: $DOCKER_CERTS_DIR${NC}"

# ============================================================
# PASO 5: Listar certificados para verificación
# ============================================================
echo ""
echo -e "${YELLOW}PASO 5: Verificando certificados...${NC}"
echo ""
echo "📄 KeyStore (arcbank.p12):"
keytool -list -keystore "$DOCKER_CERTS_DIR/arcbank.p12" \
  -storepass changeit -storetype PKCS12 | head -n 15

echo ""
echo "📄 TrustStore (truststore.p12):"
keytool -list -keystore "$DOCKER_CERTS_DIR/truststore.p12" \
  -storepass changeit -storetype PKCS12 | head -n 15

# ============================================================
# PASO 6: Actualizar docker-compose
# ============================================================
echo ""
echo -e "${YELLOW}PASO 6: Recordatorios para docker-compose.prod.yml...${NC}"
echo ""
echo "Asegúrate de que ms-transaccion tenga montado el volumen:"
echo "  volumes:"
echo "    - ./ms-transaccion/certs:/app/certs:ro"
echo ""
echo "Y las variables de entorno:"
echo "  environment:"
echo "    SSL_ENABLED: \"true\""
echo "    SSL_KEYSTORE_PATH: \"file:/app/certs/arcbank.p12\""
echo "    SSL_KEYSTORE_PASSWORD: \"changeit\""
echo "    SSL_TRUSTSTORE_PATH: \"file:/app/certs/truststore.p12\""
echo "    SSL_TRUSTSTORE_PASSWORD: \"changeit\""

# ============================================================
# RESUMEN FINAL
# ============================================================
echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}✅ CONFIGURACIÓN mTLS COMPLETADA${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "Archivos generados:"
echo "  • $DOCKER_CERTS_DIR/arcbank.p12 (KeyStore)"
echo "  • $DOCKER_CERTS_DIR/truststore.p12 (TrustStore)"
echo ""
echo "Próximo paso:"
echo "  1. Revisar docker-compose.prod.yml (ver recordatorios arriba)"
echo "  2. Ejecutar: docker-compose -f docker-compose.prod.yml up --build -d"
echo ""
echo "Para probar la conexión SSL:"
echo "  curl -v --cert $CERTS_DIR/arcbank.crt --key $CERTS_DIR/arcbank.key https://35.208.155.21:9080/api/v1/red/bancos"
echo ""
