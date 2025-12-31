package com.arcbank.cbs.transaccion.controller;

import java.math.BigDecimal;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestHeader;

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

        @org.springframework.beans.factory.annotation.Value("${app.switch.apikey}")
        private String switchApiKey;

        @PostMapping
        public ResponseEntity<?> recibirTransferenciaEntrante(
                        @RequestHeader(value = "apikey", required = false) String incomingKey,
                        @RequestBody SwitchTransferRequest request) {

                log.info("Webhook recibido (ISO 20022) en Arcbank: {}", request);

                // Validar Seguridad (API Key del Switch)
                if (incomingKey == null || !incomingKey.equals(switchApiKey)) {
                        log.warn("⚠️ Acceso denegado: apikey inválida");
                        return ResponseEntity.status(401).body(Map.of(
                                        "status", "NACK",
                                        "error", "No autorizado"));
                }

                try {
                        if (request.getHeader() == null || request.getBody() == null) {
                                return ResponseEntity.badRequest().body(Map.of(
                                                "status", "NACK",
                                                "error", "Formato de mensaje inválido"));
                        }

                        String instructionId = request.getBody().getInstructionId();

                        String cuentaDestino = null;
                        if (request.getBody().getCreditor() != null) {
                                cuentaDestino = request.getBody().getCreditor().getAccountId();
                        }

                        String bancoOrigen = "DESCONOCIDO";
                        if (request.getHeader().getOriginatingBankId() != null) {
                                bancoOrigen = request.getHeader().getOriginatingBankId();
                        }

                        BigDecimal monto = BigDecimal.ZERO;
                        if (request.getBody().getAmount() != null && request.getBody().getAmount().getValue() != null) {
                                monto = request.getBody().getAmount().getValue();
                        }

                        if (instructionId == null || cuentaDestino == null || monto.compareTo(BigDecimal.ZERO) <= 0) {
                                return ResponseEntity.badRequest().body(Map.of(
                                                "status", "NACK",
                                                "error", "Datos críticos faltantes"));
                        }

                        log.info("Simulando acreditación Arcbank: cuenta={}, monto={}, desde={}", cuentaDestino, monto,
                                        bancoOrigen);

                        // Llamada al servicio con los 4 argumentos estándar
                        transaccionService.procesarTransferenciaEntrante(instructionId, cuentaDestino, monto,
                                        bancoOrigen);

                        return ResponseEntity.ok(Map.of(
                                        "status", "ACK",
                                        "message", "Transferencia procesada exitosamente en Arcbank",
                                        "instructionId", instructionId));

                } catch (Exception e) {
                        log.error("Error procesando webhook en Arcbank: {}", e.getMessage());
                        return ResponseEntity.status(422).body(Map.of(
                                        "status", "NACK",
                                        "error", e.getMessage()));
                }
        }
}
