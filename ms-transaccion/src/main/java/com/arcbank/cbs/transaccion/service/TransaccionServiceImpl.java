package com.arcbank.cbs.transaccion.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.arcbank.cbs.transaccion.client.CuentaCliente;
import com.arcbank.cbs.transaccion.client.SwitchClient;
import com.arcbank.cbs.transaccion.dto.SaldoDTO;
import com.arcbank.cbs.transaccion.dto.TransaccionRequestDTO;
import com.arcbank.cbs.transaccion.dto.TransaccionResponseDTO;
import com.arcbank.cbs.transaccion.exception.BusinessException;
import com.arcbank.cbs.transaccion.model.Transaccion;
import com.arcbank.cbs.transaccion.repository.TransaccionRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransaccionServiceImpl implements TransaccionService {

    private final TransaccionRepository transaccionRepository;
    private final CuentaCliente cuentaCliente;
    private final SwitchClient switchClient;
    private final SwitchClientService switchClientService;

    @Value("${app.banco.codigo:ARCBANK}")
    private String codigoBanco;

    @Override
    @Transactional
    public TransaccionResponseDTO crearTransaccion(TransaccionRequestDTO request) {
        log.info("Iniciando transacción Tipo: {} | Ref: {}", request.getTipoOperacion(), request.getReferencia());

        String tipoOp = request.getTipoOperacion().toUpperCase();

        Transaccion trx = Transaccion.builder()
                .referencia(request.getReferencia() != null ? request.getReferencia() : UUID.randomUUID().toString())
                .tipoOperacion(tipoOp)
                .monto(request.getMonto())
                .descripcion(request.getDescripcion())
                .canal(request.getCanal() != null ? request.getCanal() : "WEB")
                .idSucursal(request.getIdSucursal())
                .cuentaExterna(request.getCuentaExterna())
                .idBancoExterno(request.getIdBancoExterno())
                .idTransaccionReversa(request.getIdTransaccionReversa())
                .estado("PENDIENTE")
                .build();

        try {
            BigDecimal saldoImpactado = switch (tipoOp) {
                case "DEPOSITO" -> {
                    if (request.getIdCuentaDestino() == null)
                        throw new BusinessException("El DEPOSITO requiere una cuenta destino obligatoria.");

                    trx.setIdCuentaDestino(request.getIdCuentaDestino());
                    trx.setIdCuentaOrigen(null);

                    yield procesarSaldo(trx.getIdCuentaDestino(), request.getMonto());
                }

                case "RETIRO" -> {
                    if (request.getIdCuentaOrigen() == null)
                        throw new BusinessException("El RETIRO requiere una cuenta origen obligatoria.");

                    trx.setIdCuentaOrigen(request.getIdCuentaOrigen());
                    trx.setIdCuentaDestino(null);

                    yield procesarSaldo(trx.getIdCuentaOrigen(), request.getMonto().negate());
                }

                case "TRANSFERENCIA_INTERNA" -> {
                    if (request.getIdCuentaOrigen() == null || request.getIdCuentaDestino() == null) {
                        throw new BusinessException(
                                "La TRANSFERENCIA INTERNA requiere cuenta origen y cuenta destino.");
                    }
                    if (request.getIdCuentaOrigen().equals(request.getIdCuentaDestino())) {
                        throw new BusinessException("No se puede transferir a la misma cuenta.");
                    }

                    trx.setIdCuentaOrigen(request.getIdCuentaOrigen());
                    trx.setIdCuentaDestino(request.getIdCuentaDestino());

                    BigDecimal saldoOrigen = procesarSaldo(trx.getIdCuentaOrigen(), request.getMonto().negate());
                    BigDecimal saldoDestino = procesarSaldo(trx.getIdCuentaDestino(), request.getMonto());

                    trx.setSaldoResultanteDestino(saldoDestino);

                    yield saldoOrigen;
                }

                case "TRANSFERENCIA_SALIDA", "TRANSFERENCIA_INTERBANCARIA" -> {
                    if (request.getIdCuentaOrigen() == null)
                        throw new BusinessException("Falta cuenta origen para transferencia externa.");
                    if (request.getCuentaExterna() == null || request.getCuentaExterna().isBlank())
                        throw new BusinessException("Falta cuenta destino externa para transferencia interbancaria.");

                    trx.setIdCuentaOrigen(request.getIdCuentaOrigen());
                    trx.setIdCuentaDestino(null);
                    trx.setCuentaExterna(request.getCuentaExterna());
                    trx.setIdBancoExterno(request.getIdBancoExterno());

                    BigDecimal saldoOrigen = procesarSaldo(trx.getIdCuentaOrigen(), request.getMonto().negate());

                    Map<String, Object> cuentaOrigenDetalles = obtenerDetallesCuenta(request.getIdCuentaOrigen());
                    String numeroCuentaOrigen = cuentaOrigenDetalles != null
                            && cuentaOrigenDetalles.get("numeroCuenta") != null
                                    ? cuentaOrigenDetalles.get("numeroCuenta").toString()
                                    : String.valueOf(request.getIdCuentaOrigen());

                    String nombreOrigen = "Cliente Arcbank";
                    if (cuentaOrigenDetalles != null && cuentaOrigenDetalles.get("nombreTitular") != null) {
                        nombreOrigen = cuentaOrigenDetalles.get("nombreTitular").toString();
                    }

                    try {
                        log.info("Enviando transferencia al switch via SwitchClientService: {} -> {}",
                                numeroCuentaOrigen,
                                request.getCuentaExterna());

                        com.arcbank.cbs.transaccion.dto.TxRequest txRequest = com.arcbank.cbs.transaccion.dto.TxRequest
                                .builder()
                                .debtorAccount(numeroCuentaOrigen)
                                .debtorName(nombreOrigen)
                                .creditorAccount(request.getCuentaExterna())
                                .creditorName(request.getNombreDestinatario() != null ? request.getNombreDestinatario()
                                        : "Beneficiario Externo")
                                .targetBankId(
                                        request.getIdBancoExterno() != null ? request.getIdBancoExterno() : "UNKNOWN")
                                .amount(request.getMonto())
                                .description(request.getDescripcion())
                                .build();

                        String respuestaSwitch = switchClientService.enviarTransferencia(txRequest);
                        log.info("Respuesta cruda del Switch: {}", respuestaSwitch);

                    } catch (Exception e) {
                        log.error("Error comunicando con switch, revirtiendo débito: {}", e.getMessage());
                        procesarSaldo(trx.getIdCuentaOrigen(), request.getMonto());
                        throw new BusinessException("Error comunicando con switch interbancario: " + e.getMessage());
                    }

                    yield saldoOrigen;
                }

                case "TRANSFERENCIA_ENTRADA" -> {
                    if (request.getIdCuentaDestino() == null)
                        throw new BusinessException("Falta cuenta destino para recepción externa.");

                    trx.setIdCuentaDestino(request.getIdCuentaDestino());
                    trx.setIdCuentaOrigen(null);

                    yield procesarSaldo(trx.getIdCuentaDestino(), request.getMonto());
                }

                default -> throw new BusinessException("Tipo de operación no soportado: " + tipoOp);
            };

            trx.setSaldoResultante(saldoImpactado);
            trx.setEstado("COMPLETADA");

            Transaccion guardada = transaccionRepository.save(trx);
            log.info("Transacción guardada ID: {}", guardada.getIdTransaccion());

            return mapearADTO(guardada, null);

        } catch (BusinessException be) {
            throw be;
        } catch (Exception e) {
            log.error("Error técnico procesando transacción: ", e);
            throw e;
        }
    }

    @Override
    public List<TransaccionResponseDTO> obtenerPorCuenta(Integer idCuenta) {
        return transaccionRepository.findPorCuenta(idCuenta).stream()
                .map(t -> mapearADTO(t, idCuenta))
                .collect(Collectors.toList());
    }

    @Override
    public TransaccionResponseDTO obtenerPorId(Integer id) {
        if (id == null) {
            throw new BusinessException("El ID de la transacción no puede ser nulo.");
        }
        Transaccion t = transaccionRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Transacción no encontrada con ID: " + id));
        return mapearADTO(t, null);
    }

    private BigDecimal procesarSaldo(Integer idCuenta, BigDecimal montoCambio) {
        BigDecimal saldoActual;

        try {
            saldoActual = cuentaCliente.obtenerSaldo(idCuenta);
            if (saldoActual == null) {
                throw new BusinessException("La cuenta ID " + idCuenta + " existe pero retornó saldo nulo.");
            }
        } catch (Exception e) {
            log.error("Error conectando con MS Cuentas: {}", e.getMessage());
            throw new BusinessException("No se pudo validar la cuenta ID: " + idCuenta + ". Verifique que exista.");
        }

        BigDecimal nuevoSaldo = saldoActual.add(montoCambio);

        if (nuevoSaldo.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException(
                    "Fondos insuficientes en la cuenta ID: " + idCuenta + ". Saldo actual: " + saldoActual);
        }

        try {
            cuentaCliente.actualizarSaldo(idCuenta, new SaldoDTO(nuevoSaldo));
        } catch (Exception e) {
            throw new BusinessException("Error al actualizar el saldo de la cuenta ID: " + idCuenta);
        }

        return nuevoSaldo;
    }

    private TransaccionResponseDTO mapearADTO(Transaccion t, Integer idCuentaVisor) {
        BigDecimal saldoAMostrar = t.getSaldoResultante();

        log.info("Mapeando Tx: {}, Visor: {}, Dest: {}, SaldoDest: {}",
                t.getIdTransaccion(), idCuentaVisor, t.getIdCuentaDestino(), t.getSaldoResultanteDestino());

        if (idCuentaVisor != null &&
                t.getIdCuentaDestino() != null &&
                t.getIdCuentaDestino().equals(idCuentaVisor) &&
                t.getSaldoResultanteDestino() != null) {

            saldoAMostrar = t.getSaldoResultanteDestino();
        }

        return TransaccionResponseDTO.builder()
                .idTransaccion(t.getIdTransaccion())
                .referencia(t.getReferencia())
                .tipoOperacion(t.getTipoOperacion())
                .idCuentaOrigen(t.getIdCuentaOrigen())
                .idCuentaDestino(t.getIdCuentaDestino())
                .cuentaExterna(t.getCuentaExterna())
                .idBancoExterno(t.getIdBancoExterno())
                .monto(t.getMonto())
                .saldoResultante(saldoAMostrar)
                .fechaCreacion(t.getFechaCreacion())
                .descripcion(t.getDescripcion())
                .canal(t.getCanal())
                .estado(t.getEstado())
                .build();
    }

    private Map<String, Object> obtenerDetallesCuenta(Integer idCuenta) {
        try {
            return cuentaCliente.obtenerCuenta(idCuenta);
        } catch (Exception e) {
            log.warn("No se pudo obtener detalles de cuenta para ID {}: {}", idCuenta, e.getMessage());
            return null;
        }
    }

    private String obtenerNumeroCuenta(Integer idCuenta) {
        try {
            Map<String, Object> cuenta = cuentaCliente.obtenerCuenta(idCuenta);
            if (cuenta != null && cuenta.get("numeroCuenta") != null) {
                return cuenta.get("numeroCuenta").toString();
            }
        } catch (Exception e) {
            log.warn("No se pudo obtener número de cuenta para ID {}: {}", idCuenta, e.getMessage());
        }
        return String.valueOf(idCuenta);
    }

    private Integer obtenerIdCuentaPorNumero(String numeroCuenta) {
        try {
            Map<String, Object> cuenta = cuentaCliente.buscarPorNumero(numeroCuenta);
            if (cuenta != null && cuenta.get("idCuenta") != null) {
                return Integer.valueOf(cuenta.get("idCuenta").toString());
            }
        } catch (Exception e) {
            log.error("Error buscando cuenta por número {}: {}", numeroCuenta, e.getMessage());
        }
        return null;
    }

    @Override
    @Transactional
    public void procesarTransferenciaEntrante(String instructionId, String cuentaDestino,
            BigDecimal monto, String bancoOrigen) {
        log.info("📥 Procesando transferencia entrante desde {} a cuenta {}, monto: {}",
                bancoOrigen, cuentaDestino, monto);

        Integer idCuentaDestino = obtenerIdCuentaPorNumero(cuentaDestino);
        if (idCuentaDestino == null) {
            throw new BusinessException("Cuenta destino no encontrada en Arcbank: " + cuentaDestino);
        }

        if (transaccionRepository.findByReferencia(instructionId).isPresent()) {
            log.warn("Transferencia entrante duplicada ignorada: {}", instructionId);
            return;
        }

        BigDecimal nuevoSaldo = procesarSaldo(idCuentaDestino, monto);

        Transaccion trx = Transaccion.builder()
                .referencia(instructionId)
                .tipoOperacion("TRANSFERENCIA_ENTRADA")
                .idCuentaDestino(idCuentaDestino)
                .idCuentaOrigen(null)
                .cuentaExterna(cuentaDestino)
                .monto(monto)

                .saldoResultante(nuevoSaldo)
                .idBancoExterno(bancoOrigen) // Registrar quién envió
                .descripcion("Transferencia recibida desde " + bancoOrigen)
                .canal("SWITCH")
                .estado("COMPLETADA")
                .build();

        Transaccion guardada = transaccionRepository.save(trx);
        if (guardada == null) {
            log.error("Error crítico: La transacción no se pudo guardar.");
            return;
        }
        log.info("✅ Transferencia entrante completada. ID: {}, Nuevo saldo: {}",
                trx.getIdTransaccion(), nuevoSaldo);
    }
}