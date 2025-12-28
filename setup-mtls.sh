#!/bin/bash

# ============================================================
# GUIA COMPLETA: Configuración de mTLS para ArcBank
# ============================================================
# Este script debe ejecutarse en la VM vmarcbank después del
# git clone y antes del docker-compose up
# ============================================================

set -e

echo "🔐 CONFIGURACIÓN mTLS - ARCBANK → DIGICONECU"
echo "=============================================="
echo ""

# Variables
CERTS_DIR=~/seguridad
PROJECT_DIR=~/BancoArcbank
# Cambiado a nginx/certs según requerimiento
DOCKER_CERTS_DIR=$PROJECT_DIR/nginx/certs

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ============================================================
# PASO 1: Verificar que los certificados existen
# ============================================================
echo -e "${YELLOW}PASO 1: Verificando certificados generados...${NC}"

if [ ! -f "$CERTS_DIR/arcbank.key" ] || [ ! -f "$CERTS_DIR/arcbank.crt" ]; then
    echo -e "${RED}❌ Certificados de ArcBank no encontrados en $CERTS_DIR${NC}"
    echo "Por favor ejecuta primero:"
    echo "  mkdir -p ~/seguridad && cd ~/seguridad"
    echo "  openssl req -new -x509 -nodes -newkey rsa:2048 \\"
    echo "    -keyout arcbank.key -out arcbank.crt -days 365 \\"
    echo "    -subj \"/C=EC/ST=Pichincha/L=Quito/O=Arcbank/CN=arcbank.switch.com\""
    exit 1
fi

echo -e "${GREEN}✓ Certificados de ArcBank encontrados${NC}"

# ============================================================
# PASO 2: Convertir certificados a formato PKCS12
# ============================================================
echo ""
echo -e "${YELLOW}PASO 2: Convirtiendo certificados a PKCS12...${NC}"

# Crear KeyStore PKCS12 (combina clave privada + certificado)
openssl pkcs12 -export \
  -in "$CERTS_DIR/arcbank.crt" \
  -inkey "$CERTS_DIR/arcbank.key" \
  -out "$CERTS_DIR/arcbank-keystore.p12" \
  -name "arcbank-client-cert" \
  -passout pass:arcbank123

echo -e "${GREEN}✓ KeyStore creado: arcbank-keystore.p12${NC}"

# ============================================================
# PASO 3: Crear TrustStore (certificados confiables)
# ============================================================
echo ""
echo -e "${YELLOW}PASO 3: Creando TrustStore...${NC}"

# Obtener certificado del switch DIGICONECU (si es posible)
echo "Intentando obtener certificado del switch..."
echo | openssl s_client -connect 35.208.155.21:9080 2>/dev/null | \
  openssl x509 -out "$CERTS_DIR/digiconecu.crt" || {
    echo -e "${YELLOW}⚠ No se pudo obtener certificado del switch vía s_client${NC}"
}

# Determinar qué certificado importar al TrustStore
CERT_TO_IMPORT="$CERTS_DIR/digiconecu.crt"
if [ ! -f "$CERT_TO_IMPORT" ]; then
    echo -e "${YELLOW}⚠ Usando arcbank.crt como fallback para TrustStore (Solo para inicializar)${NC}"
    CERT_TO_IMPORT="$CERTS_DIR/arcbank.crt"
fi

# Crear TrustStore e importar certificado
keytool -import \
  -trustcacerts \
  -alias digiconecu-switch \
  -file "$CERT_TO_IMPORT" \
  -keystore "$CERTS_DIR/arcbank-truststore.p12" \
  -storetype PKCS12 \
  -storepass arcbank123 \
  -noprompt || echo -e "${YELLOW}⚠ TrustStore ya existe o error menor${NC}"

echo -e "${GREEN}✓ TrustStore creado: arcbank-truststore.p12${NC}"

# ============================================================
# PASO 4: Copiar certificados al proyecto
# ============================================================
echo ""
echo -e "${YELLOW}PASO 4: Copiando certificados al proyecto (nginx/certs)...${NC}"

# Crear directorio de certificados en el proyecto
mkdir -p "$DOCKER_CERTS_DIR"

# Copiar archivos
cp "$CERTS_DIR/arcbank-keystore.p12" "$DOCKER_CERTS_DIR/"
cp "$CERTS_DIR/arcbank-truststore.p12" "$DOCKER_CERTS_DIR/"
cp "$CERTS_DIR/arcbank.crt" "$DOCKER_CERTS_DIR/"
cp "$CERTS_DIR/arcbank.key" "$DOCKER_CERTS_DIR/"

# Permisos seguros
chmod 644 "$DOCKER_CERTS_DIR"/*.p12
chmod 600 "$DOCKER_CERTS_DIR"/*.key

echo -e "${GREEN}✓ Certificados copiados a: $DOCKER_CERTS_DIR${NC}"

# ============================================================
# PASO 5: Listar certificados para verificación
# ============================================================
echo ""
echo -e "${YELLOW}PASO 5: Verificando certificados...${NC}"
echo ""
echo "📄 KeyStore (arcbank-keystore.p12):"
keytool -list -keystore "$DOCKER_CERTS_DIR/arcbank-keystore.p12" \
  -storepass arcbank123 -storetype PKCS12 | head -n 15

echo ""
echo "📄 TrustStore (arcbank-truststore.p12):"
keytool -list -keystore "$DOCKER_CERTS_DIR/arcbank-truststore.p12" \
  -storepass arcbank123 -storetype PKCS12 | head -n 15

# ============================================================
# RESUMEN FINAL
# ============================================================
echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}✅ CONFIGURACIÓN mTLS ARCBANK COMPLETADA${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "Archivos generados en nginx/certs:"
echo "  • arcbank-keystore.p12"
echo "  • arcbank-truststore.p12"
echo ""
echo "Próximo paso:"
echo "  1. Ejecutar: docker-compose -f docker-compose.prod.yml up --build -d"
echo ""
