# Infraestructura en Google Cloud Platform (GCP) - Proyecto Arcbank

Este documento detalla los recursos y servicios de Google Cloud solicitados y utilizados para soportar la infraestructura de **Arcbank**.

La arquitectura se basa en un modelo **IaaS (Infrastructure as a Service)**, centralizando la ejecución en una instancia de computación (Compute Engine) gestionada manualmente, en lugar de utilizar servicios gestionados (PaaS/SaaS) para bases de datos o contenedores.

---

## 1. Servicios Activos

### A. Google Compute Engine (GCE)
Es el núcleo de la infraestructura. Todos los microservicios, bases de datos y frontends se ejecutan dentro de una única máquina virtual.

*   **Recurso**: VM Instance (Máquina Virtual).
*   **Nombre de Instancia**: `vmarcbank` (según guías de despliegue).
*   **Sistema Operativo**: Linux (Debian/Ubuntu detectado por comandos `apt-get`).
*   **Función**:
    *   Host de Docker Engine y Docker Compose.
    *   Ejecución de contenedores:
        *   `api-gateway-arcbank` (Java/Spring Boot)
        *   `micro-clientes`, `micro-cuentas`, `ms-transaccion` (Java/Spring Boot)
        *   `frontend-web`, `frontend-cajero` (Nginx/React)
        *   `postgres` y `mongo` (Bases de datos en contenedores)
        *   `nginx-proxy` (Reverse Proxy para SSL)

### B. VPC Network (Networking)
Gestión de la red para permitir la conectividad pública y con el Switch Interbancario.

*   **Recurso**: VPC Firewall Rules (Reglas de Cortafuegos).
*   **Configuración de Puertos (Ingress/Entrada)**:
    *   **TCP 80 (HTTP)**: Abierto para validación de certificados SSL (Certbot) y redirección.
    *   **TCP 443 (HTTPS)**: Abierto para acceso seguro a la Banca Web.
    *   **TCP 8443 (HTTPS)**: Abierto para acceso seguro al Cajero Automático.
    *   **TCP 4080 (Gateway/API)**: Abierto para recibir Webhooks del Switch DIGICONECU y administración.
    *   **TCP 22 (SSH)**: Acceso administrativo (gestionado por Identity-Aware Proxy o directo).
*   **Target Tag**: `arcbank-vm` (etiqueta usada para aplicar reglas específicamente a esta máquina).

*   **Recurso**: External IP Address (Dirección IP Externa).
    *   **Tipo**: Estática (Static IP) o Efímera (Ephemeral) reservada.
    *   **Uso**: Punto de entrada único para el dominio `arcbank-bank.duckdns.org` y para la comunicación con el Switch.
    *   **IP Actual (Referencia)**: `35.208.155.21` (IP pública expuesta en documentación).

### C. IAM (Identity and Access Management)
Control de acceso para la administración de la infraestructura.
*   **Uso**: Autenticación del desarrollador/devops para acceder vía `gcloud compute ssh`.

---

## 2. Servicios de Terceros (No GCP)
Aunque la infraestructura corre en GCP, ciertos componentes críticos se delegan a servicios externos o soluciones self-hosted:

*   **DNS**: **DuckDNS** (Proveedor externo). Se usa para asignar el dominio `arcbank-bank.duckdns.org` a la IP de la VM de GCP.
*   **Certificados SSL**: **Let's Encrypt** (vía Certbot). Generados dentro de la VM, no se usa Google-managed SSL certificates.

---

## 3. Comparativa: Arquitectura Actual vs. Nativa Cloud
Para futuras evoluciones, se detalla qué servicios están siendo "simulados" en la VM vs. sus equivalentes gestionados en GCP:

| Componente | Implementación Actual (IaaS - VM) | Equivalente Nativo GCP (Sugerido para Producción) |
| :--- | :--- | :--- |
| **Cómputo** | Docker Compose en VM | **Google Kubernetes Engine (GKE)** o **Cloud Run** |
| **Base de Datos** | Contenedores Docker (Postgres/Mongo) | **Cloud SQL** (PostgreSQL) y **MongoDB Atlas** |
| **Balanceador** | Nginx Proxy en VM | **Cloud Load Balancing** (Https Load Balancer) |
| **Secretos** | Variables de entorno / Archivos `.env` | **Secret Manager** |
| **Logs** | Archivos locales / `docker logs` | **Cloud Logging** (Operations Suite) |
| **DNS** | DuckDNS | **Cloud DNS** |

---

## 4. Diagrama de Infraestructura GCP

```mermaid
graph TD
    Internet((Internet)) -->|HTTPS 443/8443| Firewall
    Switch((Switch Interbancario)) -->|HTTP 4080| Firewall
    
    subgraph "Google Cloud Platform - Project Arcbank"
        subgraph "VPC Network"
            Firewall[Firewall Rules<br/>TCP 80, 443, 8443, 4080] --> VM_IP[External Static IP<br/>35.208.155.21]
            
            subgraph "Compute Engine Zone"
                subgraph "VM Instance: vmarcbank"
                    VM_IP --> Nginx[Nginx Reverse Proxy<br/>(Docker)]
                    
                    Nginx -->|:80| FrontendWeb[Frontend Web]
                    Nginx -->|:80| FrontendATM[Frontend Cajero]
                    Nginx -->|:8080| Gateway[API Gateway]
                    
                    Gateway --> MS_Clientes
                    Gateway --> MS_Cuentas
                    Gateway --> MS_Transaccion
                    
                    MS_Clientes --> DB_PG[(PostgreSQL)]
                    MS_Sucursales --> DB_Mongo[(MongoDB)]
                end
            end
        end
    end
```
