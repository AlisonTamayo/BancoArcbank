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
@RequestMapping("/api/core/transferencias/recepcion")
@RequiredArgsConstructor
public class WebhookController {

        private final TransaccionService transaccionService;

        @PostMapping
        public ResponseEntity<?> recibirTransferenciaEntrante(@RequestBody SwitchTransferRequest request) {
                log.info("📥 Webhook recibido en Arcbank (ISO 20022): {}", request);

                try {
                        if (request.getHeader() == null || request.getBody() == null) {
                                return ResponseEntity.badRequest().body(Map.of(
                                                "status", "NACK",
                                                "error", "Formato inválido"));
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
                                log.warn("⚠️ Datos incompletos en el webhook: id={}, cuenta={}, monto={}",
                                                instructionId, cuentaDestino, monto);
                                return ResponseEntity.badRequest().body(Map.of(
                                                "status", "NACK",
                                                "error", "Datos incompletos"));
                        }

                        log.info("💰 Solicitud de abono en Arcbank: Cta {} | Monto {} | Desde {}", cuentaDestino, monto,
                                        bancoOrigen);

                        // Ejecutar acreditación
                        transaccionService.procesarTransferenciaEntrante(instructionId, cuentaDestino, monto,
                                        bancoOrigen);

                        return ResponseEntity.ok(Map.of(
                                        "status", "ACK",
                                        "message", "Acreditación exitosa en Arcbank",
                                        "instructionId", instructionId));

                } catch (Exception e) {
                        log.error("❌ Error procesando abono en Arcbank: {}", e.getMessage());
                        return ResponseEntity.status(422).body(Map.of(
                                        "status", "NACK",
                                        "error", e.getMessage()));
                }
        }

        @PostMapping("/devoluciones")
        public ResponseEntity<?> recibirDevolucion(
                        @RequestBody com.arcbank.cbs.transaccion.dto.SwitchDevolucionRequest request) {
                log.info("🔄 Webhook Devolución recibido en Arcbank (pacs.004): {}", request);
                try {
                        transaccionService.procesarDevolucionEntrante(request);
                        return ResponseEntity.ok(Map.of("status", "ACK", "message", "Devolución procesada"));
                } catch (Exception e) {
                        log.error("❌ Error procesando devolución: {}", e.getMessage());
                        return ResponseEntity.badRequest().body(Map.of("status", "NACK", "error", e.getMessage()));
                }
        }
}