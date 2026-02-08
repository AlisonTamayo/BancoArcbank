import React, { useState } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import { transacciones } from '../../services/api';
import './ListaMovimientosDevolucion.css';

export default function ListaMovimientosDevolucion() {
    const [codigoReferencia, setCodigoReferencia] = useState('');
    const [loading, setLoading] = useState(false);
    const [transaccion, setTransaccion] = useState(null);
    const [error, setError] = useState('');
    const [motivo, setMotivo] = useState('AM04');
    const [procesando, setProcesando] = useState(false);

    const cajero = JSON.parse(localStorage.getItem('cajero'));

    // Catálogo ISO 20022 proporcionado por Reglas de Negocio
    const ISO_REASONS = [
        { code: 'AC03', description: '❌ Cuenta Inexistente (Invalid Creditor Account)' },
        { code: 'AC06', description: '🔒 Cuenta Bloqueada (Blocked Account)' },
        { code: 'AC04', description: '🚫 Cuenta Cerrada (Closed Account)' },
        { code: 'AM04', description: '📉 Saldo Insuficiente (Limits)' },
        { code: 'AM05', description: '⚠️ Duplicidad (Duplication)' },
        { code: 'FRAD', description: '🚨 Fraude (Fraudulent Origin)' },
        { code: 'AG01', description: '⛔ Operación Prohibida (Transaction Forbidden)' },
        { code: 'CUST', description: '👤 Solicitada por Cliente (Requested By Customer)' },
        { code: 'MS03', description: '📡 Error Técnico Interno (Technical Error)' }
    ];

    const buscarTransaccion = async () => {
        const codigo = codigoReferencia.trim();

        if (!codigo || codigo.length < 6 || isNaN(codigo)) {
            setError('Por favor ingrese un Código de Referencia válido (6 dígitos numéricos)');
            return;
        }

        setLoading(true);
        setError('');
        setTransaccion(null);

        try {
            const data = await transacciones.buscarPorCodigoReferencia(codigo);
            setTransaccion(data);
        } catch (err) {
            setError(err.message || 'Transacción no encontrada');
        } finally {
            setLoading(false);
        }
    };

    const handleSolicitarReverso = async () => {
        if (!transaccion) return;

        if (!window.confirm(`¿Confirma que desea solicitar la devolución de $${transaccion.monto}?\n\nMotivo: ${motivo}`)) {
            return;
        }

        setProcesando(true);
        try {
            await transacciones.solicitarReverso(transaccion.idTransaccion, motivo);
            alert('✅ Solicitud de devolución enviada exitosamente al Switch.');
            setTransaccion(null);
            setCodigoReferencia('');
        } catch (err) {
            alert('❌ Error: ' + (err.message || 'Fallo en el sistema'));
        } finally {
            setProcesando(false);
        }
    };

    const formatFecha = (fecha) => {
        if (!fecha) return '-';

        let dateObj;

        // Si es un array (LocalDateTime de Java)
        if (Array.isArray(fecha)) {
            dateObj = new Date(fecha[0], fecha[1] - 1, fecha[2], fecha[3] || 0, fecha[4] || 0, fecha[5] || 0);
        } else if (typeof fecha === 'string' && fecha.includes('T') && !fecha.endsWith('Z')) {
            dateObj = new Date(fecha.replace('T', ' '));
        } else {
            dateObj = new Date(fecha);
        }

        return dateObj.toLocaleString('es-EC', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Guayaquil'
        });
    };

    return (
        <div className="sel-container">
            <Sidebar cajero={cajero} />
            <main className="sel-main">
                <div className="sel-header-box">
                    <div className="sel-header-content">
                        <div className="sel-header-text">
                            <h2 className="sel-user-name">🔄 Módulo de Devoluciones</h2>
                            <p className="text-muted">Busque una transacción por su ID para solicitar devolución</p>
                        </div>
                    </div>
                </div>

                {/* Buscador */}
                <div className="search-container">
                    <label className="search-label">Código de Referencia:</label>
                    <div className="search-box">
                        <input
                            type="text"
                            value={codigoReferencia}
                            onChange={(e) => {
                                // Solo permitir números
                                const val = e.target.value;
                                if (/^\d*$/.test(val) && val.length <= 6) {
                                    setCodigoReferencia(val);
                                }
                            }}
                            placeholder="Ej: 123456"
                            className="search-input"
                            onKeyPress={(e) => e.key === 'Enter' && buscarTransaccion()}
                        />
                        <button
                            onClick={buscarTransaccion}
                            className="btn-buscar"
                            disabled={loading}
                        >
                            {loading ? '🔍 Buscando...' : '🔍 Buscar Transacción'}
                        </button>
                    </div>
                    {error && <p className="error-message">{error}</p>}
                </div>

                {/* Detalle de Transacción */}
                {transaccion && (
                    <div className="detalle-container">
                        <h3>📋 Detalle de la Transacción #{transaccion.idTransaccion}</h3>

                        <div className="detalle-grid">
                            <div className="detalle-item">
                                <span className="detalle-label">Cód. Referencia:</span>
                                <span className="detalle-value id-value">{transaccion.codigoReferencia || transaccion.idTransaccion}</span>
                            </div>
                            <div className="detalle-item">
                                <span className="detalle-label">Monto:</span>
                                <span className="detalle-value monto">${transaccion.monto}</span>
                            </div>
                            <div className="detalle-item">
                                <span className="detalle-label">Fecha:</span>
                                <span className="detalle-value">{formatFecha(transaccion.fechaCreacion)}</span>
                            </div>
                            <div className="detalle-item">
                                <span className="detalle-label">Tipo:</span>
                                <span className="detalle-value">{transaccion.tipoOperacion}</span>
                            </div>
                            <div className="detalle-item">
                                <span className="detalle-label">Banco Destino:</span>
                                <span className="detalle-value">{transaccion.bancoDestino || 'Local'}</span>
                            </div>
                            <div className="detalle-item">
                                <span className="detalle-label">Cuenta Destino:</span>
                                <span className="detalle-value">{transaccion.cuentaExterna || 'N/A'}</span>
                            </div>
                            <div className="detalle-item">
                                <span className="detalle-label">Estado:</span>
                                <span className={`detalle-value estado ${transaccion.estado}`}>{transaccion.estado}</span>
                            </div>
                            <div className="detalle-item">
                                <span className="detalle-label">Horas Transcurridas:</span>
                                <span className="detalle-value">{transaccion.horasTranscurridas}h</span>
                            </div>
                            <div className="detalle-item full-width">
                                <span className="detalle-label">Descripción:</span>
                                <span className="detalle-value">{transaccion.descripcion || '-'}</span>
                            </div>
                            {transaccion.referencia && (
                                <div className="detalle-item full-width">
                                    <span className="detalle-label">Referencia Switch:</span>
                                    <span className="detalle-value referencia">{transaccion.referencia}</span>
                                </div>
                            )}
                        </div>

                        {/* Validaciones */}
                        <div className="validaciones-box">
                            <h4>📊 Validaciones para Devolución:</h4>
                            <ul className="validaciones-list">
                                <li className={transaccion.esReversible ? 'valid' : 'invalid'}>
                                    {transaccion.esReversible ? '✅' : '❌'} Tipo de transacción reversible (Interbancaria/Salida)
                                </li>
                                <li className={transaccion.dentroDe24Horas ? 'valid' : 'invalid'}>
                                    {transaccion.dentroDe24Horas ? '✅' : '❌'} Dentro del plazo de 24 horas ({transaccion.horasTranscurridas}h transcurridas)
                                </li>
                                <li className={transaccion.estadoValido ? 'valid' : 'invalid'}>
                                    {transaccion.estadoValido ? '✅' : '❌'} Estado válido para devolución (actual: {transaccion.estado})
                                </li>
                            </ul>
                        </div>

                        {/* Formulario de Devolución */}
                        {transaccion.puedeReversarse ? (
                            <div className="devolucion-form">
                                <h4>📝 Solicitar Devolución</h4>
                                <label className="motivo-label">Motivo de la devolución (Catálogo ISO 20022):</label>
                                <select
                                    value={motivo}
                                    onChange={(e) => setMotivo(e.target.value)}
                                    className="select-motivo"
                                >
                                    {ISO_REASONS.map(m => (
                                        <option key={m.code} value={m.code}>
                                            {m.code} - {m.description}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    className="btn-confirm"
                                    onClick={handleSolicitarReverso}
                                    disabled={procesando}
                                >
                                    {procesando ? '⏳ Procesando...' : '🔄 Enviar Solicitud de Devolución'}
                                </button>
                            </div>
                        ) : (
                            <div className="no-reversable-box">
                                <p className="no-reversable-text">
                                    ⚠️ Esta transacción no cumple con los requisitos para solicitar devolución.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
