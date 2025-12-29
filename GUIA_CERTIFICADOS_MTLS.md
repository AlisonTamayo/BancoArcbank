# 🔐 Guía: Generación de Certificados mTLS para ARCBANK

## 🎯 Arquitectura de Certificados

Los certificados se generan y almacenan **dentro del proyecto** en:
```
ms-transaccion/src/main/resources/certs/
```

Esta ubicación permite que:
- ✅ Los certificados se incluyan en el JAR al compilar
- ✅ No se pierdan al redeployar con Docker
- ✅ Se puedan versionar en Git (si son para desarrollo)
- ✅ Spring Boot los cargue desde el classpath

---

## 🚀 Cómo Generar Certificados

### 1. Ejecutar el script (primera vez o si no existen)

```bash
# En el directorio raíz del proyecto
cd ~/BancoArcbank

# Dar permisos de ejecución
chmod +x generate-mtls-certs.sh

# Ejecutar
./generate-mtls-certs.sh
```

### 2. Comportamiento Inteligente

El script **verifica automáticamente** si los certificados ya existen:

- ✅ **Si NO existen**: Los genera usando Docker (evita problemas de librerías)
- ✅ **Si YA existen**: Salta la generación y muestra mensaje de confirmación

```bash
# Si ya existen, verás:
✅ Certificados ya existen en ms-transaccion/src/main/resources/certs
   No es necesario regenerarlos.
```

---

## 📄 Archivos Generados

Después de ejecutar el script, tendrás:

```
ms-transaccion/src/main/resources/certs/
├── arcbank.key                 # Clave privada (NUNCA compartir)
├── arcbank.crt                 # Certificado público
├── arcbank-keystore.p12        # KeyStore para Java (incluye clave + cert)
├── arcbank-truststore.p12      # TrustStore para validar certificados remotos
└── arcbank-public-cert.pem     # 📤 Archivo para entregar al Switch
```

---

## 📤 ¿Qué Entregar al Switch DIGICONECU?

### Archivo:
```
ms-transaccion/src/main/resources/certs/arcbank-public-cert.pem
```

### Cómo visualizarlo:

```bash
cat ~/BancoArcbank/ms-transaccion/src/main/resources/certs/arcbank-public-cert.pem
```

### Contenido del archivo:

```
# ============================================================
# CERTIFICADO PÚBLICO DE ARCBANK
# ============================================================
# Consumer: banco-arcbank
# Código: ARCBANK
# ============================================================

-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIUa1b2...
...
-----END CERTIFICATE-----
```

**IMPORTANTE**: Este es el único archivo que debes compartir con el Switch.

---

## 🔄 Persistencia en Git y Despliegues

### ¿Los certificados se versionen en Git?

Depende de tu estrategia:

#### Opción 1: No versionar (recomendado para producción)

```bash
# Agregar al .gitignore
echo "ms-transaccion/src/main/resources/certs/*.p12" >> .gitignore
echo "ms-transaccion/src/main/resources/certs/*.key" >> .gitignore
```

**En deploy:**
1. El script detecta que no existen
2. Los genera automáticamente
3. Se incluyen en el JAR al compilar

#### Opción 2: Versionar (solo para desarrollo)

```bash
# NO agregar al .gitignore
git add ms-transaccion/src/main/resources/certs/
git commit -m "feat: add development mTLS certificates"
```

**Ventajas:**
- ✅ Mismos certificados en todos los entornos
- ✅ No se regeneran en cada deploy

**Desventajas:**
- ⚠️ Expones las claves privadas en el repositorio
- ⚠️ No recomendado para producción

---

## 🐳 Integración con Docker

### El script usa Docker para generar certificados

**¿Por qué usar Docker?**
- ✅ Evita problemas de librerías en el host
- ✅ Garantiza consistencia entre entornos
- ✅ No requiere instalar OpenSSL/Java en la VM

**Comando usado internamente:**
```bash
sudo docker run --rm -v "$(pwd):/work" -w /work eclipse-temurin:17-jdk-alpine sh -c '
  apk add --no-cache openssl
  # Generación de certificados...
'
```

---

## 📋 Flujo en GitHub Actions (Deploy Automático)

### Workflow típico en `.github/workflows/deploy.yml`:

```yaml
- name: Generar certificados mTLS (si no existen)
  run: |
    chmod +x generate-mtls-certs.sh
    ./generate-mtls-certs.sh

- name: Build Docker image
  run: |
    docker build -t arcbank/ms-transaccion:latest ./ms-transaccion
    # Los certificados ya están en src/main/resources/certs/
    # Se incluirán en el JAR automáticamente
```

**Ventaja**: No necesitas montar volúmenes en Docker Compose.

---

## 🔐 Contraseñas de los Keystores

Las contraseñas están configuradas como:

```
KeyStore password: arcbank123
TrustStore password: arcbank123
```

**Para cambiarlas en producción:**

```yaml
# En docker-compose.prod.yml
environment:
  MTLS_KEYSTORE_PASSWORD: tu-contraseña-segura
  MTLS_TRUSTSTORE_PASSWORD: tu-contraseña-segura
```

Y regenerar los certificados con las nuevas contraseñas (editar el script).

---

## 🧪 Verificar Certificados

### Listar archivos generados:

```bash
ls -lh ~/BancoArcbank/ms-transaccion/src/main/resources/certs/
```

### Inspeccionar el KeyStore:

```bash
keytool -list -keystore ~/BancoArcbank/ms-transaccion/src/main/resources/certs/arcbank-keystore.p12 \
  -storepass arcbank123 -storetype PKCS12
```

### Inspeccionar el certificado público:

```bash
openssl x509 -in ~/BancoArcbank/ms-transaccion/src/main/resources/certs/arcbank.crt \
  -noout -subject -issuer -dates
```

**Deberías ver:**
```
subject=C = EC, ST = Pichincha, L = Quito, O = Arcbank, CN = arcbank.switch.com
issuer=C = EC, ST = Pichincha, L = Quito, O = Arcbank, CN = arcbank.switch.com
notBefore=Dec 29 07:00:00 2025 GMT
notAfter=Dec 29 07:00:00 2026 GMT
```

---

## 🔄 Regenerar Certificados (si es necesario)

Si necesitas regenerar los certificados (por ejemplo, expiraron):

```bash
# Eliminar certificados existentes
rm -rf ~/BancoArcbank/ms-transaccion/src/main/resources/certs/*

# Regenerar
./generate-mtls-certs.sh
```

---

## 📊 Diferencias con setup-mtls.sh (eliminado)

| Característica | setup-mtls.sh (antiguo) | generate-mtls-certs.sh (nuevo) |
|----------------|-------------------------|--------------------------------|
| Ubicación certs | `~/seguridad/` + `nginx/certs/` | `ms-transaccion/src/main/resources/certs/` |
| Persistencia | Requiere volúmenes Docker | Incluido en JAR automáticamente |
| Regeneración | Siempre regenera | Solo si no existen |
| Complejidad | 2 ubicaciones + copia | 1 ubicación directa |

---

## ✅ Checklist de Implementación

- [x] Script `generate-mtls-certs.sh` creado
- [x] Ubicación: `ms-transaccion/src/main/resources/certs/`
- [x] Verificación de existencia antes de generar
- [x] Generación usando Docker (evita dependencias)
- [x] Certificados con nombre correcto: `arcbank.*`
- [x] Archivo para entregar al Switch: `arcbank-public-cert.pem`
- [x] Configuración en `application.yaml`: `classpath:certs/`
- [x] Docker Compose actualizado (sin volúmenes innecesarios)
- [x] Archivo antiguo `setup-mtls.sh` eliminado

---

## 🎉 Resultado Final

Ahora tu proyecto tiene:

1. ✅ **Generación automática** de certificados
2. ✅ **Persistencia dentro del proyecto** (no se pierden)
3. ✅ **No regeneración innecesaria** (verifica si existen)
4. ✅ **Compatible con CI/CD** (GitHub Actions)
5. ✅ **Archivo listo para entregar al Switch** (`arcbank-public-cert.pem`)

**Próximo paso**: Ejecutar el script en la VM y entregar el certificado público al administrador del Switch. 🔐
