package com.arcbank.cbs.transaccion.service;

import com.arcbank.cbs.transaccion.client.SwitchClient;
import com.arcbank.cbs.transaccion.dto.SwitchDevolucionRequest;
import com.arcbank.cbs.transaccion.dto.SwitchTransferRequest;
import com.arcbank.cbs.transaccion.dto.TxRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SwitchClientService {

        private final SwitchClient switchClient;

        @Value("${app.banco.codigo:ARCBANK}")
        private String bancoCodigo;

        public String enviarTransferencia(TxRequest request) {
                log.info("Iniciando envío de transferencia interbancaria via Feign: {} -> {}",
                                request.getDebtorAccount(), request.getCreditorAccount());

                SwitchTransferRequest isoRequest = SwitchTransferRequest.builder()
                                .header(SwitchTransferRequest.Header.builder()
                                                .messageId("MSG-" + UUID.randomUUID().toString().substring(0, 8))
                                                .creationDateTime(java.time.Instant.now()
                                                                .truncatedTo(java.time.temporal.ChronoUnit.SECONDS)
                                                                .toString())
                                                .originatingBankId(bancoCodigo)
                                                .build())
                                .body(SwitchTransferRequest.Body.builder()
                                                .instructionId(request.getReferenceId() != null
                                                                ? request.getReferenceId()
                                                                : UUID.randomUUID().toString())
                                                .endToEndId("E2E-" + UUID.randomUUID().toString().substring(0, 8))
                                                .amount(SwitchTransferRequest.Amount.builder()
                                                                .currency("USD")
                                                                .value(request.getAmount())
                                                                .build())
                                                .debtor(SwitchTransferRequest.Party.builder()
                                                                .name(request.getDebtorName())
                                                                .accountId(request.getDebtorAccount())
                                                                .accountType("AHORROS")
                                                                .bankId(bancoCodigo)
                                                                .build())
                                                .creditor(SwitchTransferRequest.Party.builder()
                                                                .name(request.getCreditorName())
                                                                .accountId(request.getCreditorAccount())
                                                                .accountType("AHORROS")
                                                                .targetBankId(request.getTargetBankId() != null
                                                                                ? request.getTargetBankId()
                                                                                : "BANTEC")
                                                                .build())
                                                .remittanceInformation(request.getDescription())
                                                .build())
                                .build();

                try {
                        log.info("JSON enviado al Switch: {}", new com.fasterxml.jackson.databind.ObjectMapper()
                                        .writeValueAsString(isoRequest));
                        String response = switchClient.enviarTransferencia(isoRequest);

                        if (response == null || response.isBlank()) {
                                response = "{\"status\": \"SUCCESS\", \"message\": \"Transferencia enviada correctamente\"}";
                        }

                        log.info("Respuesta del Switch recibida: {}", response);
                        return response;

                } catch (feign.FeignException e) {
                        log.error("Switch retornó error HTTP {}: {}", e.status(), e.contentUTF8());
                        String errorMsg = e.contentUTF8();

                        // Intentar mapear a un código ISO conocido para UX
                        String isoCode = "MS03"; // Default: Error Técnico

                        if (errorMsg != null) {
                                // Busqueda simple de códigos en el string crudo (funciona para JSON array u
                                // objeto)
                                if (errorMsg.contains("AC01"))
                                        isoCode = "AC01";
                                else if (errorMsg.contains("AC04"))
                                        isoCode = "AC04";
                                else if (errorMsg.contains("AC06"))
                                        isoCode = "AC06"; // Cuenta bloqueada
                                else if (errorMsg.contains("AG01"))
                                        isoCode = "AG01";
                                else if (errorMsg.contains("AM04"))
                                        isoCode = "AM04";
                                else if (errorMsg.contains("AM05") || errorMsg.contains("DUPL"))
                                        isoCode = "MD01";
                                else if (errorMsg.contains("RC01"))
                                        isoCode = "RC01";
                        }

                        // Lanzar excepción limpia
                        String finalMsg = isoCode.equals("MS03") ? "Error técnico en Switch/Banco Destino" : errorMsg;
                        throw new RuntimeException(isoCode + " - " + finalMsg);

                } catch (Exception e) {
                        log.error("Error técnico comunicación Switch: {}", e.getMessage());
                        throw new RuntimeException("Error de comunicación: " + e.getMessage());
                }
        }

        public String enviarReverso(String originalInstructionId, String returnReason, BigDecimal amount,
                        String debtorName, String debtorAccount,
                        String creditorName, String creditorAccount, String targetBankId) {
                log.info("Iniciando solicitud de reverso para Tx: {}", originalInstructionId);

                SwitchDevolucionRequest isoRequest = SwitchDevolucionRequest.builder()
                                .header(SwitchDevolucionRequest.Header.builder()
                                                .messageId(UUID.randomUUID().toString()) // UUID Puro sin prefijos
                                                .creationDateTime(java.time.Instant.now()
                                                                .truncatedTo(java.time.temporal.ChronoUnit.SECONDS)
                                                                .toString())
                                                .originatingBankId(bancoCodigo)
                                                .build())
                                .body(SwitchDevolucionRequest.Body.builder()
                                                .returnInstructionId(UUID.randomUUID().toString()) // UUID Puro sin
                                                                                                   // prefijos
                                                .originalInstructionId(originalInstructionId != null
                                                                ? originalInstructionId.trim()
                                                                : null)
                                                .returnReason(mapearErrorIso(returnReason))
                                                .returnAmount(SwitchDevolucionRequest.ReturnAmount.builder()
                                                                .currency("USD")
                                                                .value(amount)
                                                                .build())
                                                .build())
                                .build();

                try {
                        String response = switchClient.enviarDevolucion(isoRequest);
                        log.info("Respuesta de Devolución del Switch (200 OK): {}", response);

                        return response;

                } catch (Exception e) {
                        log.error("Error al solicitar reverso (Switch rechazó): {}", e.getMessage());

                        throw new RuntimeException("Switch rechazó el reverso: " + e.getMessage());
                }
        }

        public java.util.List<java.util.Map<String, String>> obtenerMotivosDevolucion() {
                try {
                        return switchClient.obtenerMotivosDevolucion();
                } catch (Exception e) {
                        log.error("Error al obtener motivos del Switch: {}", e.getMessage());
                        return java.util.Collections.emptyList();
                }
        }

        private static String mapearErrorIso(String internalCode) {
                if (internalCode == null)
                        return "MS03";

                String code = internalCode.toUpperCase().trim();

                return switch (code) {
                        case "TECH", "ERROR_TECNICO" -> "MS03";
                        case "CUENTA_INVALIDA", "AC03" -> "AC03";
                        case "SALDO_INSUFICIENTE", "AM04" -> "AM04";
                        case "DUPLICADO", "DUPL", "MD01" -> "MD01";
                        case "FRAUDE", "FRAD", "FR01" -> "FR01";
                        case "CUST", "CLIENTE" -> "CUST";
                        default -> {
                                if (code.matches("^[A-Z0-9]{4}$")) {
                                        yield code;
                                }
                                log.warn("Código de devolución desconocido '{}', mapeando a MS03", code);
                                yield "MS03";
                        }
                };
        }

        public java.util.Map<String, Object> consultarEstado(String instructionId) {
                try {
                        return switchClient.consultarEstado(instructionId);
                } catch (Exception e) {
                        log.warn("Error consultando estado de Tx {}: {}", instructionId, e.getMessage());
                        return null;
                }
        }
}
