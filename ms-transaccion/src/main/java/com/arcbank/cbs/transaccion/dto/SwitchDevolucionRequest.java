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
        private String returnInstructionId; // ID de instrucción de devolución
        private String originalInstructionId; // ID de la transacción original
        private String returnReason; // Código motivo (DUPL, CUST, TECH...)
        private ReturnAmount returnAmount; // Monto exacto a devolver
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReturnAmount {
        private String currency;
        private BigDecimal value;
    }
}
