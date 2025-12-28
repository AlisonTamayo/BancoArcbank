package com.arcbank.cbs.transaccion.controller;

import java.math.BigDecimal;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.arcbank.cbs.transaccion.dto.SwitchTransferRequest;
import com.arcbank.cbs.transaccion.service.TransaccionService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/transacciones/webhook")
@RequiredArgsConstructor
public class WebhookController {

        private final TransaccionService transaccionService;

        @PostMapping
        public ResponseEntity<?> recibirTransferenciaEntrante(@RequestBody SwitchTransferRequest payload) {
                log.info("📥 Webhook recibido del switch: {}", payload);

                try {
                        if (payload == null || payload.getBody() == null || payload.getHeader() == null) {
                                log.warn("Webhook con datos incompletos (nulo): {}", payload);
                                return ResponseEntity.badRequest().body(Map.of(
                                                "status", "NACK",
                                                "error", "Estructura de mensaje inválida"));
                        }

                        SwitchTransferRequest.Body body = payload.getBody();
                        SwitchTransferRequest.Header header = payload.getHeader();

                        String instructionId = body.getInstructionId();
                        String cuentaDestino = body.getCreditor() != null ? body.getCreditor().getAccountId() : null;
                        String bancoOrigen = header.getOriginatingBankId();

                        BigDecimal monto = BigDecimal.ZERO;
                        if (body.getAmount() != null) {
                                monto = body.getAmount().getValue();
                        }

                        if (instructionId == null || cuentaDestino == null || monto == null
                                        || monto.compareTo(BigDecimal.ZERO) <= 0) {
                                log.warn("Webhook con datos incompletos: {}", payload);
                                return ResponseEntity.badRequest().body(Map.of(
                                                "status", "NACK",
                                                "error",
                                                "Datos obligatorios faltantes (instructionId, accountId o amount)"));
                        }

                        transaccionService.procesarTransferenciaEntrante(
                                        instructionId, cuentaDestino, monto, bancoOrigen);

                        log.info("✅ Transferencia entrante procesada: {} -> cuenta {}", bancoOrigen, cuentaDestino);

                        return ResponseEntity.ok(Map.of(
                                        "status", "ACK",
                                        "message", "Transferencia procesada exitosamente",
                                        "instructionId", instructionId));

                } catch (Exception e) {
                        log.error("❌ Error procesando webhook: {}", e.getMessage(), e);
                        return ResponseEntity.status(422).body(Map.of(
                                        "status", "NACK",
                                        "error", e.getMessage()));
                }
        }
}
