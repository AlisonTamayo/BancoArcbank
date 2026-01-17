# Guía de Pruebas de Devolución (Local)

Esta guía asume que los contenedores de Arcbank y el Switch están corriendo en la red `switchcambios_default`.

## 1. Verificar Estado
Asegúrate de que los servicios estén activos:
```powershell
docker ps
```
Deberías ver `ms-transaccion-arcbank2` conectado a la red y el Switch (`ms-nucleo`, etc.).

## 2. Crear Transferencia Interbancaria (Escenario)
Primero necesitamos una transferencia saliente exitosa para poder pedir su devolución.

**Endpoint:** `POST http://localhost:4082/api/transacciones`
**Headers:** `Content-Type: application/json`

```json
{
  "referencia": "REF-TEST-001",
  "tipoOperacion": "TRANSFERENCIA_INTERBANCARIA",
  "monto": 100.00,
  "descripcion": "Pago de prueba para dev",
  "idCuentaOrigen": 1, 
  "cuentaExterna": "1234567890",
  "idBancoExterno": "BANCO_B",
  "nombreDestinatario": "Juan Perez"
}
```
*Nota: Ajusta `idCuentaOrigen` a una cuenta existente en tu DB local (puedes verlas en `db-cuentas-arcbank`).*

**Respuesta Esperada:**
Toma nota del `idTransaccion` (ej. `15`). El estado debe ser `COMPLETADA`.

## 3. Solicitar Devolución
Ahora solicitamos el reverso de esa transacción.

**Endpoint:** `POST http://localhost:4082/api/transacciones/{ID_TRANSACCION}/devolucion`
(Reemplaza `{ID_TRANSACCION}` con el ID obtenido, ej. `15`)

**Body:**
```json
{
  "motivo": "DUPLICADO"
}
```

**Respuesta Esperada:**
*   **Estado:** `REVERSADA`
*   **Saldo:** El monto debe haber sido acreditado nuevamente a la cuenta origen.

## 4. Validación Técnica
El servicio `ms-transaccion` realiza internamente:
1.  Validación de 24 horas y estado.
2.  Llamada al Switch (`ms-nucleo`) para notificar el reverso.
3.  Compensación local (devolución del saldo).

Si el Switch rechaza la devolución (ej. el otro banco ya no tiene fondos), recibirás un error 422 o 500.
