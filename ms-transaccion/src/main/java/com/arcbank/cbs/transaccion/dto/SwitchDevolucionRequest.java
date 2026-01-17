package com.arcbank.cbs.transaccion.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SwitchDevolucionRequest {

    private Header header;
    private Body body;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Header {
        private String messageId;
        private String creationDateTime;
        private String originatingBankId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Body {
        private String originalInstructionId; // ID de la transacción original en el Switch
        private String returnReason; // FRAD, TECH, DUPL
        private Amount amount;
        private Party debtor; // Quien pide la devolución (Banco Origen/Cliente)
        private Party creditor; // Quien tiene el dinero (Banco Destino/Beneficiario)
        private String remittanceInformation;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Amount {
        private String currency;
        private BigDecimal value;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Party {
        private String name;
        private String accountId;
        private String accountType;
        private String targetBankId;
    }
}
