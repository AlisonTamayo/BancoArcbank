# 🚀 GUÍA DE DESPLIEGUE - VM GOOGLE CLOUD (ARCBANK)

Este documento detalla los pasos para desplegar el ecosistema de **ArcBank** en una Máquina Virtual de Google Cloud Platform (GCP).

## 📍 Información de Red (IPs)

| Componente | VM Name | IP Pública | Rol |
| :--- | :--- | :--- | :--- |
| **ArcBank** | `vmarcbank` | `IP_DE_TU_VM` | Banco Originador |
| **Digiconecu** | `vmdigiconecu` | `35.208.155.21` | Switch Transaccional |

---

## 🛠️ PASO 1: Preparación de la VM

1. **Configurar DuckDNS**:
   - Ve a [duckdns.org](https://www.duckdns.org).
   - Crea el dominio `arcbank-bank`.
   - Asocia la IP pública de tu VM (`IP_DE_TU_VM`) al dominio.

2. **Conectarse a la VM**:
   ```bash
   gcloud compute ssh vmarcbank --zone=TU_ZONA
   ```

3. **Instalar Docker y Docker Compose**:
   ```bash
   sudo apt-get update && sudo apt-get upgrade -y
   curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

4. **Configurar Firewall en Google Cloud / VM**:
   Asegúrate de abrir los puertos:
   - `80` (HTTP - Reto Certbot)
   - `443` (HTTPS - Banca Web)
   - `8443` (HTTPS - Cajero ATM)
   - `4080` (Webhooks Switch)

---

## 📂 PASO 2: Clonar el Proyecto

```bash
cd ~
git clone https://github.com/AlisonTamayo/BancoArcbank.git
cd BancoArcbank
```

---

## 🔐 PASO 3: Configurar Certificados SSL (HTTPS Público)

Usaremos **Certbot** vía Docker para obtener certificados de Let's Encrypt para tu dominio de DuckDNS.

### 3.1 Generar Certificados (Primera vez)
Asegúrate de que nada esté usando el puerto 80 antes de correr este comando:
```bash
docker run -it --rm --name certbot \
  -v "$(pwd)/nginx/certs:/etc/letsencrypt" \
  -v "$(pwd)/nginx/certbot:/var/www/certbot" \
  certbot/certbot certonly --standalone \
  -d arcbank-bank.duckdns.org \
  --email tu-email@gmail.com \
  --agree-tos --no-eff-email
```

### 3.2 Verificar Archivos
Deberías ver los archivos en:
`./nginx/certs/live/arcbank-bank.duckdns.org/`

---

## 🔑 PASO 4: Configurar mTLS para el Switch

1. **Ejecutar script de configuración**:
   ```bash
   cd ~/BancoArcbank
   chmod +x generate-mtls-certs.sh
   ./generate-mtls-certs.sh
   ```

2. **Enviar certificado al Switch**:
   Entrega el archivo generado `arcbank.crt` al administrador del Switch.

---

## 🚀 PASO 5: Despliegue con Docker

Levanta todos los servicios en modo producción:

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

---

## 🌐 URLs de Acceso

| Servicio | URL |
| :--- | :--- |
| **Banca Web** | [https://arcbank-bank.duckdns.org](https://arcbank-bank.duckdns.org) |
| **Cajero ATM** | [https://arcbank-bank.duckdns.org:8443](https://arcbank-bank.duckdns.org:8443) |
| **API Gateway / Swagger** | [http://IP_DE_TU_VM:4080/swagger-ui.html](http://IP_DE_TU_VM:4080/swagger-ui.html) |

---

**Última actualización**: 27 de Diciembre de 2025
