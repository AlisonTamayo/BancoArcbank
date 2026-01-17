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
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
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
                                                .creationDateTime(OffsetDateTime.now()
                                                                .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME))
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
                                                                .accountType("SAVINGS")
                                                                .build())
                                                .creditor(SwitchTransferRequest.Party.builder()
                                                                .name(request.getCreditorName())
                                                                .accountId(request.getCreditorAccount())
                                                                .accountType("SAVINGS")
                                                                .targetBankId(request.getTargetBankId())
                                                                .build())
                                                .remittanceInformation(request.getDescription())
                                                .build())
                                .build();

                try {
                        String response = switchClient.enviarTransferencia(isoRequest);

                        if (response == null || response.isBlank()) {
                                response = "{\"status\": \"SUCCESS\", \"message\": \"Transferencia enviada correctamente\"}";
                        }

                        log.info("Respuesta del Switch recibida: {}", response);
                        return response;

                } catch (Exception e) {
                        log.error("Error en la comunicación con el Switch via Feign: {}", e.getMessage());
                        throw new RuntimeException("Error en comunicación con el Switch: " + e.getMessage());
                }
        }

        public String enviarReverso(String originalInstructionId, String returnReason, BigDecimal amount,
                        String debtorName, String debtorAccount,
                        String creditorName, String creditorAccount, String targetBankId) {
                log.info("Iniciando solicitud de reverso para Tx: {}", originalInstructionId);

                SwitchDevolucionRequest isoRequest = SwitchDevolucionRequest.builder()
                                .header(SwitchDevolucionRequest.Header.builder()
                                                .messageId("MSG-REV-" + UUID.randomUUID().toString().substring(0, 8))
                                                .creationDateTime(OffsetDateTime.now()
                                                                .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME))
                                                .originatingBankId(bancoCodigo)
                                                .build())
                                .body(SwitchDevolucionRequest.Body.builder()
                                                .originalInstructionId(originalInstructionId)
                                                .returnReason(returnReason)
                                                .amount(SwitchDevolucionRequest.Amount.builder()
                                                                .currency("USD")
                                                                .value(amount)
                                                                .build())
                                                .debtor(SwitchDevolucionRequest.Party.builder()
                                                                .name(debtorName)
                                                                .accountId(debtorAccount)
                                                                .build())
                                                .creditor(SwitchDevolucionRequest.Party.builder()
                                                                .name(creditorName)
                                                                .accountId(creditorAccount)
                                                                .targetBankId(targetBankId)
                                                                .build())
                                                .build())
                                .build();

                try {
                        String response = switchClient.enviarDevolucion(isoRequest);
                        log.info("Respuesta de Devolución del Switch: {}", response);
                        return response;
                } catch (Exception e) {
                        log.error("Error al solicitar reverso: {}", e.getMessage());
                        throw new RuntimeException("Error comunicando con Switch para reverso: " + e.getMessage());
                }
        }
}
