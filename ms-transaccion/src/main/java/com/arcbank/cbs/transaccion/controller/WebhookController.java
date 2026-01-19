package com.arcbank.cbs.transaccion.controller;

import java.math.BigDecimal;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.arcbank.cbs.transaccion.dto.SwitchTransferRequest;
import com.arcbank.cbs.transaccion.service.TransaccionService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequiredArgsConstructor
public class WebhookController {

        private final TransaccionService transaccionService;
        private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

        // ENDPOINT ÚNICO (UNIFICADO) PARA EL SWITCH
        // Una sola URL que detecta si es Transferencia o Devolución
        // ENDPOINT ÚNICO (UNIFICADO) PARA EL SWITCH - Usando la URL Legacy que ya
        // funciona
        // http://35.208.155.21:4080/api/core/transferencias/recepcion
        @PostMapping("/api/core/transferencias/recepcion")
        public ResponseEntity<?> recibirWebhookUnificado(@RequestBody Map<String, Object> payload) {
                try {
                        Map<String, Object> body = (Map<String, Object>) payload.get("body");

                        // Si tiene 'originalInstructionId' o 'returnReason', es una DEVOLUCIÓN
                        // (pacs.004)
                        if (body != null && (body.containsKey("originalInstructionId")
                                        || body.containsKey("returnReason"))) {
                                log.info("🔄 Webhook detectado como DEVOLUCIÓN (pacs.004)");
                                com.arcbank.cbs.transaccion.dto.SwitchDevolucionRequest req = objectMapper.convertValue(
                                                payload, com.arcbank.cbs.transaccion.dto.SwitchDevolucionRequest.class);
                                return recibirDevolucion(req);
                        }
                        // Si no, asumimos que es una TRANSFERENCIA ENTRE CUENTAS - ABONO (pacs.008)
                        else {
                                log.info("📥 Webhook detectado como TRANSFERENCIA (pacs.008)");
                                SwitchTransferRequest req = objectMapper.convertValue(payload,
                                                SwitchTransferRequest.class);
                                log.info("Processing transfer ID: {}", req.getBody().getInstructionId());
                                return procesarTransferencia(req);
                        }
                } catch (Exception e) {
                        log.error("❌ Error en webhook unificado: {}", e.getMessage());
                        return ResponseEntity.status(422).body(Map.of("status", "NACK", "error",
                                        "Error procesando payload unificado: " + e.getMessage()));
                }
        }

        // Endpoint V3.0 Standard para devoluciones (Confirmación Asíncrona)
        @PostMapping("/api/incoming/return")
        public ResponseEntity<?> recibirDevolucion(
                        @RequestBody com.arcbank.cbs.transaccion.dto.SwitchDevolucionRequest request) {
                log.info("🔄 Webhook Devolución V3.0 recibido (Confirmación Asíncrona): {}",
                                request.getBody().getOriginalInstructionId());
                try {
                        transaccionService.procesarDevolucionEntrante(request);
                        // Respondemos ACK siempre, ya sea procesada ahora o previamente (Idempotencia)
                        return ResponseEntity.ok(Map.of("status", "ACK", "message", "Devolución confirmada"));
                } catch (Exception e) {
                        log.error("❌ Error procesando confirmación de devolución: {}", e.getMessage());
                        // Aun si falla la lógica interna, si es un error de negocio (ej. no existe tx),
                        // devolvemos NACK
                        return ResponseEntity.badRequest().body(Map.of("status", "NACK", "error", e.getMessage()));
                }
        }

        // Método auxiliar para lógica de transferencia
        private ResponseEntity<?> procesarTransferencia(SwitchTransferRequest request) {
                try {
                        if (request.getHeader() == null || request.getBody() == null) {
                                return ResponseEntity.badRequest()
                                                .body(Map.of("status", "NACK", "error", "Formato inválido"));
                        }

                        String instructionId = request.getBody().getInstructionId();
                        String cuentaDestino = request.getBody().getCreditor() != null
                                        ? request.getBody().getCreditor().getAccountId()
                                        : null;
                        String bancoOrigen = request.getHeader().getOriginatingBankId() != null
                                        ? request.getHeader().getOriginatingBankId()
                                        : "DESCONOCIDO";

                        BigDecimal monto = BigDecimal.ZERO;
                        if (request.getBody().getAmount() != null && request.getBody().getAmount().getValue() != null) {
                                monto = request.getBody().getAmount().getValue();
                        }

                        if (instructionId == null || cuentaDestino == null || monto.compareTo(BigDecimal.ZERO) <= 0) {
                                return ResponseEntity.badRequest()
                                                .body(Map.of("status", "NACK", "error", "Datos incompletos"));
                        }

                        transaccionService.procesarTransferenciaEntrante(instructionId, cuentaDestino, monto,
                                        bancoOrigen);

                        return ResponseEntity.ok(Map.of(
                                        "status", "ACK",
                                        "message", "Acreditación exitosa en Arcbank",
                                        "instructionId", instructionId));

                } catch (Exception e) {
                        log.error("❌ Error procesando abono: {}", e.getMessage());
                        return ResponseEntity.status(422).body(Map.of("status", "NACK", "error", e.getMessage()));
                }
        }
}