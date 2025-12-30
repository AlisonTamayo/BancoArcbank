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
@RequestMapping("/api/core/transferencias")
@RequiredArgsConstructor
public class WebhookController {

        private final TransaccionService transaccionService;

        @PostMapping("/recepcion")
        public ResponseEntity<?> recibirTransferenciaEntrante(@RequestBody SwitchTransferRequest payload) {
                log.info("📥 [INBOUND] Webhook ISO 20022 recibido: {}", payload);

                try {
                        if (payload == null || payload.getBody() == null) {
                                return ResponseEntity.badRequest().body(Map.of("error", "Payload inválido"));
                        }

                        String accountId = payload.getBody().getCreditor() != null
                                        ? payload.getBody().getCreditor().getAccountId()
                                        : null;
                        BigDecimal amount = payload.getBody().getAmount() != null
                                        ? payload.getBody().getAmount().getValue()
                                        : BigDecimal.ZERO;
                        String instructionId = payload.getBody().getInstructionId();
                        String bancoOrigen = payload.getHeader() != null ? payload.getHeader().getOriginatingBankId()
                                        : "UNKNOWN";

                        if (accountId == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                                log.warn("Webhook con datos incompletos: accountId={}, amount={}", accountId, amount);
                                return ResponseEntity.badRequest()
                                                .body(Map.of("error", "Datos obligatorios faltantes"));
                        }

                        log.info("💰 Solicitud de acreditación interna: Cuenta={}, Monto={}, BancoOrigen={}",
                                        accountId, amount, bancoOrigen);

                        transaccionService.procesarTransferenciaEntrante(instructionId, accountId, amount, bancoOrigen);

                        log.info("✅ Simulación de acreditación EXITOSA para cuenta {}", accountId);

                        return ResponseEntity.ok(Map.of(
                                        "status", "COMPLETADO",
                                        "mensaje", "Dinero acreditado exitosamente al cliente interno",
                                        "cuenta", accountId,
                                        "monto", amount));

                } catch (Exception e) {
                        log.error("❌ Error en recepción de transferencia: {}", e.getMessage());
                        return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
                }
        }
}
