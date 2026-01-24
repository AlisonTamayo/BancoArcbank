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

        String referenciaUtil = request.getReferencia();
        // Garantizar UUID válido (36 chars) para cumplir con estándar del Switch
        if (referenciaUtil == null || referenciaUtil.length() != 36) {
            referenciaUtil = UUID.randomUUID().toString();
        }

        Transaccion trx = Transaccion.builder()
                .referencia(referenciaUtil)
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
                                .referenceId(trx.getReferencia())
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
        BigDecimal saldoAMostrar = t.getSaldoResultante() != null ? t.getSaldoResultante() : BigDecimal.ZERO;

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
                .idBancoExterno(bancoOrigen)
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

    @Override
    @Transactional
    public TransaccionResponseDTO solicitarDevolucion(Integer idTransaccion, String motivo) {
        log.info("Solicitando devolución para Tx ID: {} | Motivo: {}", idTransaccion, motivo);

        Transaccion trx = transaccionRepository.findById(idTransaccion)
                .orElseThrow(() -> new BusinessException("Transacción no encontrada con ID: " + idTransaccion));

        if (trx.getFechaCreacion().isBefore(java.time.LocalDateTime.now().minusHours(24))) {
            throw new BusinessException("El tiempo límite de 24h para devoluciones ha expirado.");
        }

        if ("REVERSADA".equals(trx.getEstado()) || "DEVUELTA".equals(trx.getEstado())) {
            throw new BusinessException("Esta transacción ya fue reversada o devuelta.");
        }

        if ("TRANSFERENCIA_SALIDA".equals(trx.getTipoOperacion())
                || "TRANSFERENCIA_INTERBANCARIA".equals(trx.getTipoOperacion())) {

            return procesarReversoSalida(trx, motivo);

        } else if ("TRANSFERENCIA_ENTRADA".equals(trx.getTipoOperacion())) {

            return procesarDevolucionIniciada(trx, motivo);

        } else {
            throw new BusinessException(
                    "Solo se pueden devolver transferencias interbancarias (Entrada o Salida). Tipo actual: "
                            + trx.getTipoOperacion());
        }
    }

    private TransaccionResponseDTO procesarReversoSalida(Transaccion trx, String motivo) {
        String numeroCuentaOrigen = obtenerNumeroCuenta(trx.getIdCuentaOrigen());
        Map<String, Object> cuentaOrigenDetalles = obtenerDetallesCuenta(trx.getIdCuentaOrigen());
        String nombreOrigen = "Cliente Arcbank";
        if (cuentaOrigenDetalles != null && cuentaOrigenDetalles.get("nombreTitular") != null) {
            nombreOrigen = cuentaOrigenDetalles.get("nombreTitular").toString();
        }

        try {
            switchClientService.enviarReverso(
                    trx.getReferencia(),
                    motivo,
                    trx.getMonto(),
                    nombreOrigen,
                    numeroCuentaOrigen,
                    "Beneficiario Externo",
                    trx.getCuentaExterna(),
                    trx.getIdBancoExterno());
        } catch (Exception e) {
            throw new BusinessException("El Switch rechazó la solicitud de reverso: " + e.getMessage());
        }

        procesarSaldo(trx.getIdCuentaOrigen(), trx.getMonto());

        trx.setEstado("REVERSADA");
        Transaccion guardada = transaccionRepository.save(trx);
        return mapearADTO(guardada, null);
    }

    private TransaccionResponseDTO procesarDevolucionIniciada(Transaccion trx, String motivo) {

        try {
            procesarSaldo(trx.getIdCuentaDestino(), trx.getMonto().negate());
        } catch (Exception e) {
            throw new BusinessException("No hay saldo suficiente para devolver la transacción.");
        }

        String numeroCuentaNuestra = obtenerNumeroCuenta(trx.getIdCuentaDestino());

        try {
            switchClientService.enviarReverso(
                    trx.getReferencia(),
                    motivo,
                    trx.getMonto(),
                    "Arcbank Initiate Return",
                    numeroCuentaNuestra,
                    "Banco Origen Original",
                    "UNKNOWN",
                    trx.getIdBancoExterno());

            trx.setEstado("DEVUELTA");
            Transaccion guardada = transaccionRepository.save(trx);
            log.info("Devolución aceptada por Switch y procesada localmente. TxID: {}", trx.getIdTransaccion());
            return mapearADTO(guardada, null);

        } catch (Exception e) {
            log.error("Fallo al enviar devolución al Switch: {}. Haciendo Rollback.", e.getMessage());

            procesarSaldo(trx.getIdCuentaDestino(), trx.getMonto());

            throw new BusinessException("El Switch rechazó la devolución: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public void procesarDevolucionEntrante(com.arcbank.cbs.transaccion.dto.SwitchDevolucionRequest request) {
        String originalInstructionId = request.getBody().getOriginalInstructionId();
        String returnInstructionId = request.getBody().getReturnInstructionId() != null
                ? request.getBody().getReturnInstructionId().trim()
                : null;
        BigDecimal amount = request.getBody().getReturnAmount().getValue();
        String motivo = request.getBody().getReturnReason();
        String originatingBank = request.getHeader().getOriginatingBankId();

        log.info("🔄 Procesando devolución entrante (pacs.004). Original: {}, ReturnID: {}",
                originalInstructionId, returnInstructionId);

        Transaccion trxOriginal = transaccionRepository.findByReferencia(originalInstructionId)
                .orElseThrow(
                        () -> new BusinessException("Transacción original no encontrada: " + originalInstructionId));

        if ("REVERSADA".equals(trxOriginal.getEstado()) || "DEVUELTA".equals(trxOriginal.getEstado())) {
            log.warn("Transacción ya procesada como reversada: {}", trxOriginal.getIdTransaccion());
            return;
        }

        Integer idCuentaAfectada;
        BigDecimal montoImpacto;
        boolean esReversoDeEntrada = false;

        if ("TRANSFERENCIA_SALIDA".equals(trxOriginal.getTipoOperacion()) ||
                "TRANSFERENCIA_INTERBANCARIA".equals(trxOriginal.getTipoOperacion())) {

            idCuentaAfectada = trxOriginal.getIdCuentaOrigen();
            montoImpacto = amount;

        } else if ("TRANSFERENCIA_ENTRADA".equals(trxOriginal.getTipoOperacion())) {

            idCuentaAfectada = trxOriginal.getIdCuentaDestino();
            montoImpacto = amount.negate();
            esReversoDeEntrada = true;

        } else {
            log.warn("Se recibió devolución para una transacción de tipo no soportado: {}",
                    trxOriginal.getTipoOperacion());
            return;
        }

        BigDecimal nuevoSaldo = procesarSaldo(idCuentaAfectada, montoImpacto);

        Transaccion.TransaccionBuilder reversoBuilder = Transaccion.builder()
                .referencia(returnInstructionId)
                .idTransaccionReversa(trxOriginal.getIdTransaccion())
                .tipoOperacion("REVERSO")
                .estado("COMPLETADA")
                .monto(amount)
                .saldoResultante(nuevoSaldo)
                .idBancoExterno(originatingBank)
                .cuentaExterna(trxOriginal.getCuentaExterna())
                .descripcion("Reverso Switch: " + motivo)
                .canal("SWITCH")
                .fechaCreacion(java.time.LocalDateTime.now());

        if (esReversoDeEntrada) {
            reversoBuilder.idCuentaOrigen(idCuentaAfectada);
            reversoBuilder.idCuentaDestino(null);
        } else {
            reversoBuilder.idCuentaDestino(idCuentaAfectada);
            reversoBuilder.idCuentaOrigen(null);
        }

        Transaccion trxReverso = reversoBuilder.build();
        transaccionRepository.save(trxReverso);

        trxOriginal.setEstado("REVERSADA");
        trxOriginal.setDescripcion(trxOriginal.getDescripcion() + " [R]");
        transaccionRepository.save(trxOriginal);

        log.info("✅ Devolución procesada exitosamente. Nueva TxID: {}", trxReverso.getIdTransaccion());
    }

    @Override
    public List<Map<String, String>> obtenerMotivosDevolucion() {
        return switchClientService.obtenerMotivosDevolucion();
    }

    @Override
    public String consultarEstadoPorInstructionId(String instructionId) {
        return transaccionRepository.findByReferencia(instructionId)
                .map(t -> {
                    String estado = t.getEstado();
                    if ("COMPLETADA".equalsIgnoreCase(estado))
                        return "COMPLETED";
                    if ("PENDIENTE".equalsIgnoreCase(estado))
                        return "PENDING";
                    if ("REVERSADA".equalsIgnoreCase(estado))
                        return "REVERSED";
                    return estado;
                })
                .orElse("NOT_FOUND");
    }
}