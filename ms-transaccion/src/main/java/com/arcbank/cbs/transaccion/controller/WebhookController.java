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

        @PostMapping("/api/core/transferencias/recepcion")
        public ResponseEntity<?> recibirWebhookUnificado(@RequestBody Map<String, Object> payload) {
                try {
                        Map<String, Object> body = (Map<String, Object>) payload.get("body");

                        if (body != null && (body.containsKey("originalInstructionId")
                                        || body.containsKey("returnReason"))) {
                                log.info("🔄 Webhook detectado como DEVOLUCIÓN (pacs.004)");
                                com.arcbank.cbs.transaccion.dto.SwitchDevolucionRequest req = objectMapper.convertValue(
                                                payload, com.arcbank.cbs.transaccion.dto.SwitchDevolucionRequest.class);
                                return recibirDevolucion(req);
                        } else {
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

        @PostMapping("/api/incoming/return")
        public ResponseEntity<?> recibirDevolucion(
                        @RequestBody com.arcbank.cbs.transaccion.dto.SwitchDevolucionRequest request) {
                log.info("🔄 Webhook Devolución V3.0 recibido (Confirmación Asíncrona): {}",
                                request.getBody().getOriginalInstructionId());
                try {
                        transaccionService.procesarDevolucionEntrante(request);
                        return ResponseEntity.ok(Map.of("status", "ACK", "message", "Devolución confirmada"));
                } catch (Exception e) {
                        log.error("❌ Error procesando confirmación de devolución: {}", e.getMessage());
                        return ResponseEntity.badRequest().body(Map.of("status", "NACK", "error", e.getMessage()));
                }
        }

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

        @org.springframework.web.bind.annotation.GetMapping("/api/core/transferencias/recepcion/status/{instructionId}")
        public ResponseEntity<?> consultarEstado(
                        @org.springframework.web.bind.annotation.PathVariable String instructionId) {
                String estado = transaccionService.consultarEstadoPorInstructionId(instructionId);

                Map<String, String> response = new java.util.HashMap<>();
                response.put("estado", estado);

                if ("NOT_FOUND".equals(estado)) {
                        return ResponseEntity.status(404).body(response);
                }

                return ResponseEntity.ok(response);
        }
}