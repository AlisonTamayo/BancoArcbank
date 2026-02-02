package com.arcbank.cbs.transaccion.listener;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.arcbank.cbs.transaccion.dto.rabbitmq.MensajeISO;
import com.arcbank.cbs.transaccion.service.TransaccionService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class IntegracionSwitchListener {

    private final TransaccionService transaccionService;
    private final RestTemplate restTemplate;

    // Inyectar URL desde variable de entorno (Docker)
    @Value("${SWITCH_API_URL:http://34.16.106.7:8000/api/v1/transacciones/callback}")
    private String switchCallbackUrl;

    private static final String MI_BANCO_ID = "ARCBANK";

    @RabbitListener(queues = "${bank.queue.name}")
    public void procesarTransferencia(MensajeISO mensaje) {
        String txId = "UNKNOWN";
        try {
            if (mensaje.getBody() == null || mensaje.getBody().getInstructionId() == null) {
                log.error("❌ Mensaje inválido recibido: {}", mensaje);
                return;
            }

            txId = mensaje.getBody().getInstructionId();
            log.info("💰 Dinero recibido del Switch! ID: {}", txId);

            // 1. ACREDITAR (LogicCore)
            String cuentaDestino = mensaje.getBody().getCreditor().getAccountId();
            BigDecimal monto = mensaje.getBody().getAmount().getValue();
            String bancoOrigen = (mensaje.getHeader() != null) ? mensaje.getHeader().getOriginatingBankId() : "UNK";

            transaccionService.procesarTransferenciaEntrante(txId, cuentaDestino, monto, bancoOrigen);

            // 2. CONFIRMAR ÉXITO
            enviarCallback(mensaje, "COMPLETED", null);
            log.info("✅ Transacción procesada y confirmada al Switch.");

        } catch (Exception e) {
            log.error("❌ Fallo al acreditar: {}", e.getMessage());

            String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
            // Determinar si es error de negocio
            if (msg.contains("cuenta") || msg.contains("no existe") || msg.contains("bloqueada")) {
                String codigoError = "AC03";
                if (msg.contains("bloqueada"))
                    codigoError = "AG01";

                enviarCallback(mensaje, "REJECTED", codigoError);

                // No reintentar errores de negocio
                throw new AmqpRejectAndDontRequeueException(codigoError + " - " + e.getMessage());
            }

            // Reintentar errores técnicos
            throw new RuntimeException("Error técnico procesando transferencia", e);
        }
    }

    private void enviarCallback(MensajeISO msgOriginal, String estado, String codigoError) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("originalInstructionId", msgOriginal.getBody().getInstructionId());
            body.put("status", estado);
            body.put("processedDateTime", LocalDateTime.now().toString());
            // Segun orden tecnica: reasonCode string vacio si es null
            body.put("reasonCode", codigoError != null ? codigoError : "");

            Map<String, Object> request = new HashMap<>();
            request.put("header", Map.of(
                    "messageId", UUID.randomUUID().toString(),
                    "respondingBankId", MI_BANCO_ID));
            request.put("body", body);

            restTemplate.postForObject(switchCallbackUrl, request, String.class);

        } catch (Exception e) {
            log.error("⚠️ Error enviando callback al Switch: {}", e.getMessage());
        }
    }
}
