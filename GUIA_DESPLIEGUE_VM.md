# 🚀 GUÍA DE DESPLIEGUE - VM GOOGLE CLOUD (ARCBANK)

Este documento detalla los pasos para desplegar el ecosistema de **ArcBank** en una Máquina Virtual de Google Cloud Platform (GCP).

## 📍 Información de Red (IPs)

| Componente | VM Name | IP Pública | Rol |
| :--- | :--- | :--- | :--- |
| **ArcBank** | `vmarcbank` | `35.209.79.193` | Banco Originador |
| **Digiconecu** | `vmdigiconecu` | `35.208.155.21` | Switch Transaccional |

---

## 🛠️ PASO 1: Preparación de la VM

1. **Conectarse a la VM**:
   ```bash
   gcloud compute ssh vmarcbank --zone=us-central1-c
   ```

2. **Instalar Docker y Docker Compose**:
   ```bash
   # Actualizar sistema
   sudo apt-get update
   sudo apt-get upgrade -y

   # Instalar Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh

   # Agregar usuario al grupo docker
   sudo usermod -aG docker $USER

   # Instalar Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Configurar Firewall en Google Cloud**:
   Asegúrate de permitir el tráfico en los puertos `80`, `443`, `8443` y `4080`.

---

## 📂 PASO 2: Clonar el Proyecto

```bash
cd ~
git clone https://github.com/AlisonTamayo/BancoArcbank.git
cd BancoArcbank
```

---

## 🔐 PASO 3: Configurar Certificados SSL (Nginx)

Para que el servidor Nginx funcione correctamente, debe mapear los certificados de la VM al contenedor.

### 3.1 Generar Certificados con Let's Encrypt
```bash
# Instalar Certbot
sudo apt-get install certbot -y

# Generar certificados para el dominio sslip.io
sudo certbot certonly --standalone \
  -d arcbank.35-209-79-193.sslip.io \
  --email arcbank2@gmail.com \
  --agree-tos \
  --non-interactive

# Copiar certificados al directorio del proyecto para que Nginx los vea
mkdir -p nginx/certs
sudo cp /etc/letsencrypt/live/arcbank.35-209-79-193.sslip.io/fullchain.pem nginx/certs/
sudo cp /etc/letsencrypt/live/arcbank.35-209-79-193.sslip.io/privkey.pem nginx/certs/
sudo chown -R $USER:$USER nginx/certs
```

### 3.2 Verificación en Docker Compose
El archivo `docker-compose.prod.yml` ya está configurado para leer estos archivos:
```yaml
  nginx-proxy:
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro  # <--- Aquí se mapean fullchain.pem y privkey.pem
```

---

## 🔑 PASO 4: Configurar mTLS para el Switch

Como ya tienes los certificados `arcbank.crt` y `arcbank.key` en la carpeta `~/seguridad`, sigue estos pasos:

1. **Ejecutar script de configuración**:
   ```bash
   cd ~/BancoArcbank
   chmod +x setup-mtls.sh
   ./setup-mtls.sh
   ```
   *Este script toma los certificados de `~/seguridad`, crea los almacenes `.p12` y los coloca en `ms-transaccion/certs`.*

2. **Enviar certificado al Switch**:
   Entrega el archivo `~/seguridad/arcbank.crt` al administrador del Switch DIGICONECU para que lo registre.

---

## 🚀 PASO 5: Despliegue con Docker

Levanta todos los servicios, incluyendo el nuevo microservicio de **sucursales**:

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

### Verificar Estado:
```bash
docker ps
docker logs -f ms-transaccion-arcbank
```

---

## 🌐 URLs de Acceso

| Servicio | URL |
| :--- | :--- |
| **Banca Web** | [https://arcbank.35-209-79-193.sslip.io](https://arcbank.35-209-79-193.sslip.io) |
| **Cajero ATM** | [https://arcbank.35-209-79-193.sslip.io:8443](https://arcbank.35-209-79-193.sslip.io:8443) |
| **API Gateway / Swagger** | [http://35.209.79.193:4080/swagger-ui.html](http://35.209.79.193:4080/swagger-ui.html) |

---

**Última actualización**: 27 de Diciembre de 2025
