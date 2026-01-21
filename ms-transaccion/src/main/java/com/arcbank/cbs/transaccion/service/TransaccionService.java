package com.arcbank.cbs.transaccion.service;

import java.math.BigDecimal;
import java.util.List;

import com.arcbank.cbs.transaccion.dto.TransaccionRequestDTO;
import com.arcbank.cbs.transaccion.dto.TransaccionResponseDTO;

public interface TransaccionService {

    TransaccionResponseDTO crearTransaccion(TransaccionRequestDTO request);

    List<TransaccionResponseDTO> obtenerPorCuenta(Integer idCuenta);

    TransaccionResponseDTO obtenerPorId(Integer id);

    void procesarTransferenciaEntrante(String instructionId, String cuentaDestino,
            BigDecimal monto, String bancoOrigen);

    TransaccionResponseDTO solicitarDevolucion(Integer idTransaccion, String motivo);

    void procesarDevolucionEntrante(com.arcbank.cbs.transaccion.dto.SwitchDevolucionRequest request);

    List<java.util.Map<String, String>> obtenerMotivosDevolucion();

    String consultarEstadoPorInstructionId(String instructionId);
}