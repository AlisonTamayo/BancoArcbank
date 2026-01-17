# Plan de Desacoplamiento de Microservicios Arcbank (Estrategia Multi-Repo)

Este documento detalla la estrategia para dividir el actual monorepositorio en repositorios independientes para cada microservicio, facilitando el despliegue distribuido en servicios Cloud (AWS ECS/EKS, Google Cloud Run) en el futuro.

## 1. Estructura de Repositorios Propuesta

Actualmente, todo vive en `BancoArcbank`. La nueva estructura consistirá en 7 repositorios independientes:

| Nuevo Repositorio | Contenido Actual (Carpeta) | Responsabilidad |
| :--- | :--- | :--- |
| `arcbank-config-deploy` | `.` (Raíz + Docker Compose) | Orquestación general, scripts de despliegue, Gateway y Configuración global. |
| `arcbank-service-clientes` | `/micro-clientes` | Gestión de identidad (KYC), personas y empresas. |
| `arcbank-service-cuentas` | `/micro-cuentas` | Core bancario (Ledger), saldos y productos. |
| `arcbank-service-transacciones` | `/ms-transaccion` | Orquestador de pagos, conexión con Switch. |
| `arcbank-service-sucursales` | `/sucursales` | Geolocalización y horarios (MongoDB). |
| `arcbank-frontend-web` | `/frontendWeb` | Banca en Línea (React). |
| `arcbank-frontend-atm` | `/frontendCajero` | Simulador de Cajero (React). |

---

## 2. Estrategia de Despliegue Unificado (El "Super Docker Compose")

Para mantener la facilidad de uso en tu VM actual (y migrable a AWS ECS), crearemos un **Repositorio Orquestador** (`arcbank-config-deploy`).

Este repositorio contendrá un archivo `docker-compose.yml` que **no construirá (`build`) el código localmente**, sino que **descargará imágenes pre-construidas** desde un Container Registry (Docker Hub, GHCR o AWS ECR).

### Flujo de CI/CD (Integración Continua)
Cada repositorio individual tendrá su propio flujo (GitHub Actions):
1.  Developer hace `push` a `arcbank-service-clientes`.
2.  GitHub Action compila Java, corre tests.
3.  Construye imagen Docker: `alisontamayo/arcbank-service-clientes:latest`.
4.  Sube la imagen a Docker Hub.

### El Nuevo `docker-compose.yml` (Ejemplo)
*Este archivo vivirá en tu VM o servicio de orquestación.*

```yaml
version: '3.8'

networks:
  arcbank-net:
    driver: bridge

services:
  # Base de Datos (Infraestructura)
  # -------------------------------
  db-clientes:
    image: postgres:15-alpine
    ...

  # Microservicios (Imágenes remotas)
  # ---------------------------------
  ms-clientes:
    image: alisontamayo/arcbank-service-clientes:latest  # <--- YA NO USA "build: context"
    pull_policy: always
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://db-clientes:5432/microcliente
      ...
    depends_on:
      - db-clientes

  ms-cuentas:
    image: alisontamayo/arcbank-service-cuentas:latest
    pull_policy: always
    ...

  frontend-web:
    image: alisontamayo/arcbank-frontend-web:latest
    ports:
      - "80:80"
```

---

## 3. Pasos para la Migración (Para tu presentación del 19 Ene)

Dado que quedan pocos días y quieres conservarlo en tu VM actual, **NO te recomiendo romper el repositorio ahora mismo** si no tienes un pipeline de CI/CD configurado.

**Plan Híbrido Recomendado (Seguro para el 19 Ene):**
1.  **Conserva el Monorepo** en tu VM actual para asegurar que todo funcione el día de la presentación.
2.  **Prepara los Dockerfiles**: Asegúrate de que cada carpeta (`micro-clientes`, etc.) tenga un `Dockerfile` que funcione de forma autónoma (Multi-stage build) para no depender de archivos padres.
3.  **Simula la separación**:
    *   Crea el archivo `docker-compose.hub.yml`.
    *   En lugar de `build: ./micro-clientes`, usa `image: arcbank/micro-clientes:1.0`.
    *   Construye las imágenes manualmente una vez:
        ```bash
        docker build -t arcbank/micro-clientes:1.0 ./micro-clientes
        docker build -t arcbank/micro-cuentas:1.0 ./micro-cuentas
        ```
    *   Levanta usando esas imágenes.

Esto te permitirá demostrar que la arquitectura soporta despliegue por imágenes (Cloud Native) sin arriesgarte a perder código o configuraciones al dividir los gits.

---

## 4. Análisis de Comunicación entre Servicios

Al separar los repositorios, la comunicación entre ellos **NO CAMBIA** si se mantienen en la misma red Docker (o VPC en AWS).

*   **Gateway -> Microservicios**: Sigue usando `http://micro-clientes:8080`. Docker resuelve el nombre del contenedor independientemente de dónde vino la imagen.
*   **Transacción -> Cuentas (Feign)**: Sigue usando `http://micro-cuentas:8081`.

**Cambio Crítico**: Si mueves repositorios, asegúrate de que **ningún servicio comparta código Java común** (librerías compartidas locales).
*   *Revisión*: Actualmente, cada MS tiene sus propios DTOs. Esto es bueno. Si tuvieras una librería `common-dto.jar`, tendrías que publicarla en Maven Central o Nexus, lo cual complica las cosas. **Tu arquitectura actual ("Share Nothing") es compatible con la separación.**

---

## 5. Conclusión
Para objetivos académicos y la presentación del 19:
1.  **No dividas el git todavía.**
2.  Usa el `docker-compose.prod.yml` que ya tienes.
3.  Explica en tu defensa que la arquitectura está "Container-Ready": Cada carpeta es un módulo autónomo con su propio Dockerfile, listo para ser extraído a un pipeline de CI/CD individual sin cambiar una sola línea de código Java.
