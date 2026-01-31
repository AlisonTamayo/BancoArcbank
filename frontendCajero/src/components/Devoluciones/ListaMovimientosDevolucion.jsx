import React, { useState } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import { transacciones } from '../../services/api';
import './ListaMovimientosDevolucion.css';

export default function ListaMovimientosDevolucion() {
    const [referencia, setReferencia] = useState('');
    const [loading, setLoading] = useState(false);
    const [transaccion, setTransaccion] = useState(null);
    const [error, setError] = useState('');
    const [motivo, setMotivo] = useState('AM04');
    const [procesando, setProcesando] = useState(false);

    const cajero = JSON.parse(localStorage.getItem('cajero'));

    // Catálogo ISO 20022 proporcionado por Reglas de Negocio
    const ISO_REASONS = [
        { code: 'AM04', description: '🚫 Saldo insuficiente en cuenta origen.' },
        { code: 'AC01', description: '❌ El número de cuenta destino no existe.' },
        { code: 'AC03', description: '💵 Moneda no permitida. Solo se aceptan Dólares.' },
        { code: 'AC04', description: '🔒 La cuenta destino está cerrada.' },
        { code: 'AG01', description: '⚠️ Operación restringida: Cierre operativo.' },
        { code: 'CH03', description: '📉 El monto excede el límite permitido.' },
        { code: 'DUPL', description: '⚠️ Transferencia duplicada.' },
        { code: 'MS03', description: '📡 Error de comunicación técnico.' },
        { code: 'RC01', description: '📝 Error interno de formato.' },
        { code: 'BE01', description: '👮 Inconsistencia de datos (Seguridad).' },
        { code: 'CUST', description: '👤 Solicitud del cliente.' },
        { code: 'FRAD', description: '⚠️ Sospecha de fraude.' }
    ];

    const buscarTransaccion = async () => {
        if (!referencia.trim()) {
            setError('Por favor ingrese un ID de transacción');
            return;
        }

        setLoading(true);
        setError('');
        setTransaccion(null);

        try {
            const data = await transacciones.buscarConDetalleSwitch(referencia.trim());
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
            setReferencia('');
        } catch (err) {
            alert('❌ Error: ' + (err.message || 'Fallo en el sistema'));
        } finally {
            setProcesando(false);
        }
    };

    const formatFecha = (fecha) => {
        if (!fecha) return '-';
        return new Date(fecha).toLocaleString('es-EC', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    return (
        <div className="sel-container">
            <Sidebar cajero={cajero} />
            <main className="sel-main">
                <div className="sel-header-box">
                    <div className="sel-header-content">
                        <div className="sel-header-text">
                            <h2 className="sel-user-name">🔄 Solicitar Devolución</h2>
                            <p className="text-muted">Busque una transacción interbancaria para solicitar devolución</p>
                        </div>
                    </div>
                </div>

                {/* Buscador */}
                <div className="search-container">
                    <label className="search-label">ID de Transacción (Referencia / InstructionId):</label>
                    <div className="search-box">
                        <input
                            type="text"
                            value={referencia}
                            onChange={(e) => setReferencia(e.target.value)}
                            placeholder="Ej: 550e8400-e29b-41d4-a716-446655440000"
                            className="search-input"
                            onKeyPress={(e) => e.key === 'Enter' && buscarTransaccion()}
                        />
                        <button
                            onClick={buscarTransaccion}
                            className="btn-buscar"
                            disabled={loading}
                        >
                            {loading ? '🔍 Buscando...' : '🔍 Buscar'}
                        </button>
                    </div>
                    {error && <p className="error-message">{error}</p>}
                </div>

                {/* Detalle de Transacción */}
                {transaccion && (
                    <div className="detalle-container">
                        <h3>📋 Detalle de la Transacción</h3>

                        <div className="detalle-grid">
                            <div className="detalle-item">
                                <span className="detalle-label">Referencia:</span>
                                <span className="detalle-value">{transaccion.referencia}</span>
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
                                <span className="detalle-value">{transaccion.bancoDestino || 'N/A'}</span>
                            </div>
                            <div className="detalle-item">
                                <span className="detalle-label">Cuenta Destino:</span>
                                <span className="detalle-value">{transaccion.cuentaExterna || 'N/A'}</span>
                            </div>
                            <div className="detalle-item">
                                <span className="detalle-label">Estado Local:</span>
                                <span className={`detalle-value estado ${transaccion.estado}`}>{transaccion.estado}</span>
                            </div>
                            <div className="detalle-item">
                                <span className="detalle-label">Estado Switch:</span>
                                <span className="detalle-value">{transaccion.estadoSwitch || 'N/A'}</span>
                            </div>
                            <div className="detalle-item full-width">
                                <span className="detalle-label">Descripción:</span>
                                <span className="detalle-value">{transaccion.descripcion || '-'}</span>
                            </div>
                        </div>

                        {/* Validaciones */}
                        <div className="validaciones-box">
                            <h4>📊 Validaciones para Devolución:</h4>
                            <ul className="validaciones-list">
                                <li className={transaccion.esReversible ? 'valid' : 'invalid'}>
                                    {transaccion.esReversible ? '✅' : '❌'} Tipo de transacción reversible (Interbancaria/Salida)
                                </li>
                                <li className={transaccion.dentroDe24Horas ? 'valid' : 'invalid'}>
                                    {transaccion.dentroDe24Horas ? '✅' : '❌'} Dentro del plazo de 24 horas
                                </li>
                                <li className={transaccion.estadoValido ? 'valid' : 'invalid'}>
                                    {transaccion.estadoValido ? '✅' : '❌'} Estado válido para devolución
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
