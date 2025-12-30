package com.arcbank.cbs.transaccion.service;

import com.arcbank.cbs.transaccion.dto.SwitchTransferRequest;
import com.arcbank.cbs.transaccion.dto.TxRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Slf4j
@Service
public class SwitchClientService {

        private final RestTemplate restTemplate;
        private final String switchUrl;
        private final String apiKey;
        private final String bancoCodigo;

        public SwitchClientService(RestTemplate restTemplate,
                        @Value("${app.switch.url}") String switchUrl,
                        @Value("${app.switch.apikey}") String apiKey,
                        @Value("${app.banco.codigo}") String bancoCodigo) {
                this.restTemplate = restTemplate;
                this.switchUrl = switchUrl;
                this.apiKey = apiKey;
                this.bancoCodigo = bancoCodigo;
        }

        public String enviarTransferencia(TxRequest request) {
                log.info("Enviando transferencia al Switch DIGICONECU: {} -> {}", request.getDebtorAccount(),
                                request.getCreditorAccount());

                SwitchTransferRequest isoRequest = SwitchTransferRequest.builder()
                                .header(SwitchTransferRequest.Header.builder()
                                                .messageId("MSG-" + UUID.randomUUID().toString().substring(0, 8))
                                                .creationDateTime(OffsetDateTime.now()
                                                                .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME))
                                                .originatingBankId(bancoCodigo)
                                                .build())
                                .body(SwitchTransferRequest.Body.builder()
                                                .instructionId(UUID.randomUUID().toString())
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

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("apikey", apiKey);

                HttpEntity<SwitchTransferRequest> entity = new HttpEntity<>(isoRequest, headers);

                try {
                        log.info("POST a URL: {}", switchUrl);
                        String response = restTemplate.postForObject(switchUrl, entity, String.class);
                        if (response == null) {
                                response = "{\"status\": \"SUCCESS\", \"message\": \"Enviado sin respuesta del cuerpo\"}";
                        }
                        log.info("Respuesta del Switch: {}", response);
                        return response;
                } catch (Exception e) {
                        log.error("Error al enviar transferencia al switch: {}", e.getMessage());
                        throw new RuntimeException("Error en comunicación con el Switch: " + e.getMessage());
                }
        }
}
