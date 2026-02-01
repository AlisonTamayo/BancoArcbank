package com.arcbank.cbs.transaccion.listener;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.arcbank.cbs.transaccion.dto.rabbitmq.MensajeISO;
import com.arcbank.cbs.transaccion.dto.rabbitmq.StatusReportDTO;
import com.arcbank.cbs.transaccion.service.TransaccionService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class IntegracionSwitchListener {

    private final TransaccionService transaccionService;
    private final RestTemplate restTemplate;

    // COLA CONFIGURADA PARA ARCBANK
    private static final String MI_COLA = "q.bank.ARCBANK.in";

    // URL DEL SWITCH PARA CALLBACKS
    private static final String SW_CALLBACK_URL = "http://34.16.106.7:8000/api/v1/transacciones/callback";
    private static final String MI_BANCO_ID = "ARCBANK";

    @RabbitListener(queues = MI_COLA)
    public void procesarTransferencia(MensajeISO mensaje) {
        String txId = "UNKNOWN";
        try {
            if (mensaje.getBody() == null || mensaje.getBody().getInstructionId() == null) {
                log.error("❌ Mensaje inválido recibido: {}", mensaje);
                return; // No reintentar basura
            }

            txId = mensaje.getBody().getInstructionId();
            log.info("📥 [RMQ] Recibida Tx: {} por ${}", txId, mensaje.getBody().getAmount().getValue());

            // 1. VALIDAR Y ACREDITAR
            String cuentaDestino = mensaje.getBody().getCreditor().getAccountId();
            BigDecimal monto = mensaje.getBody().getAmount().getValue();

            // Obtener banco origen del header
            String bancoOrigen = (mensaje.getHeader() != null) ? mensaje.getHeader().getOriginatingBankId() : "UNK";

            // Usando los 4 argumentos correctos (según firma del servicio)
            transaccionService.procesarTransferenciaEntrante(
                    txId,
                    cuentaDestino,
                    monto,
                    bancoOrigen // Antes pasaba descripcion + bancoOrigen, ahora solo bancoOrigen
            );

            // 2. ÉXITO: Confirmar al Switch
            log.info("✅ Depósito procesado exitosamente: {}", txId);
            enviarCallbackAlSwitch(txId, "COMPLETED", null, null);

        } catch (Exception e) {
            log.error("❌ Error procesando Tx {}: {}", txId, e.getMessage());

            String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";

            // Lógica para determinar si es error de negocio (NO REINTENTAR)
            if (msg.contains("cuenta") || msg.contains("no existe") || msg.contains("bloqueada")) {
                String codigoError = "AC03"; // Por defecto cuenta no existe
                if (msg.contains("bloqueada"))
                    codigoError = "AG01";

                // Enviar callback de RECHAZO
                enviarCallbackAlSwitch(txId, "REJECTED", codigoError, e.getMessage());

                // Lanzar excepción especial para no reencolar en RabbitMQ
                throw new AmqpRejectAndDontRequeueException(codigoError + " - " + e.getMessage());
            }

            // Si es otro error (Base de datos, timeout), dejamos que Spring reintente
            // o si queremos rechazar tras reintentos (manejado por DLQ policy)
            throw new RuntimeException("Error técnico procesando transferencia", e);
        }
    }

    private void enviarCallbackAlSwitch(String txId, String status, String reasonCode, String reasonDescription) {
        try {
            StatusReportDTO reporte = StatusReportDTO.builder()
                    .header(StatusReportDTO.Header.builder()
                            .messageId("RESP-" + UUID.randomUUID().toString())
                            .respondingBankId(MI_BANCO_ID)
                            .creationDateTime(LocalDateTime.now().toString())
                            .build())
                    .body(StatusReportDTO.Body.builder()
                            .originalInstructionId(UUID.fromString(txId))
                            .status(status)
                            .reasonCode(reasonCode)
                            .reasonDescription(reasonDescription)
                            .processedDateTime(LocalDateTime.now().toString())
                            .build())
                    .build();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<StatusReportDTO> request = new HttpEntity<>(reporte, headers);

            restTemplate.postForLocation(SW_CALLBACK_URL, request);
            log.info("📤 Callback enviado al Switch - Tx: {} Status: {}", txId, status);

        } catch (Exception e) {
            log.error("⚠️ Falló callback al Switch para Tx {}. Error: {}", txId, e.getMessage());
            // No lanzamos excepción aquí para no rollbackear la transacción local si el
            // callback falla
            // El Switch eventualmente preguntará o el banco reintentará el callback via job
        }
    }
}
