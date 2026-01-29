import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import { transacciones } from '../../services/api';
import './ListaMovimientosDevolucion.css';

export default function ListaMovimientosDevolucion() {
    const navigate = useNavigate();
    const [movimientos, setMovimientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [motivos, setMotivos] = useState([]);

    // Modal state
    const [selectedTx, setSelectedTx] = useState(null);
    const [motivo, setMotivo] = useState('FRAD');
    const [procesando, setProcesando] = useState(false);

    const cajero = JSON.parse(localStorage.getItem('cajero'));
    const cuenta = JSON.parse(localStorage.getItem('cuentaDevolucion'));

    // Catalogo ISO 20022 proporcionado por Reglas de Negocio
    const ISO_REASONS = [
        { code: 'AM04', description: '🚫 Saldo insuficiente en su cuenta.' },
        { code: 'AC01', description: '❌ El número de cuenta destino no existe.' },
        { code: 'AC03', description: '💵 Moneda no permitida. Solo se aceptan Dólares.' },
        { code: 'AC04', description: '🔒 La cuenta destino está cerrada.' },
        { code: 'AG01', description: '⚠️ OPERACIÓN RESTRINGIDA: Su institución está en modo de cierre operativo.' },
        { code: 'CH03', description: '📉 El monto excede el límite permitido ($10k).' },
        { code: 'DUPL', description: '⚠️ Esta transferencia ya fue procesada (Duplicada).' },
        { code: 'MS03', description: '📡 Hubo un problema de comunicación (Error Técnico).' },
        { code: 'RC01', description: '📝 Error interno de formato (Sintaxis).' },
        { code: 'BE01', description: '👮 Inconsistencia de Datos (Rechazo Seguridad).' }
    ];

    useEffect(() => {
        if (!cuenta) {
            navigate('/devoluciones/buscar');
            return;
        }
        cargarMovimientos();
        setMotivos(ISO_REASONS);
        setMotivo(ISO_REASONS[0].code);
    }, []);

    const cargarMovimientos = async () => {
        try {
            // Asumimos que existe un endpoint para traer por ID de cuenta igual que en la web
            // Si no existe, usamos api.request directo
            setLoading(true);
            const data = await transacciones.getPorCuenta(cuenta.id);

            // FIltrar solo las reversibles segun regla de negocio:
            // SOLO SALIDAS (Interbancarias enviadas) para solicitar anulación/reverso.
            // Entradas no se reversan desde aquí según requerimiento.
            const filtradas = data.filter(m => {
                const esReversible = ['TRANSFERENCIA_SALIDA', 'TRANSFERENCIA_INTERBANCARIA'].includes(m.tipoOperacion);
                const fechaOp = new Date(m.fechaCreacion);
                const hoy = new Date();
                const diffHoras = (hoy - fechaOp) / 36e5;
                const estadoValido = !['REVERSADA', 'DEVUELTA', 'FALLIDA'].includes(m.estado);

                return esReversible && diffHoras < 24 && estadoValido;
            });

            setMovimientos(filtradas.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion)));
        } catch (error) {
            console.error(error);
            alert("Error cargando movimientos");
        } finally {
            setLoading(false);
        }
    };



    const handleSolicitarReverso = async () => {
        if (!processConfirm()) return;

        setProcesando(true);
        try {
            await transacciones.solicitarReverso(selectedTx.idTransaccion, motivo);
            alert("✅ Reverso solicitado exitosamente.");
            setSelectedTx(null);
            cargarMovimientos(); // Recargar lista
        } catch (error) {
            alert("❌ Error: " + (error.message || "Fallo en el sistema"));
        } finally {
            setProcesando(false);
        }
    };

    const processConfirm = () => window.confirm("¿Confirma que desea reversar esta transacción? Esta acción afectará el saldo del cliente.");

    return (
        <div className="sel-container">
            <Sidebar cajero={cajero} />
            <main className="sel-main">
                <div className="sel-header-box">
                    <div className="sel-header-content">
                        <div className="sel-header-text">
                            <h2 className="sel-user-name">Movimientos Reversibles</h2>
                            <p className="text-muted">Cliente: {cuenta?.titular} ({cuenta?.numero})</p>
                        </div>
                    </div>
                </div>

                <div className="movimientos-container">
                    {loading ? <p>Cargando transacciones...</p> : (
                        <table className="tabla-movimientos">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Ref</th>
                                    <th>Detalle</th>
                                    <th>Monto</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movimientos.length === 0 ?
                                    <tr><td colSpan="5">No hay transacciones reversibles recientes.</td></tr>
                                    : movimientos.map(m => (
                                        <tr key={m.idTransaccion}>
                                            <td>{new Date(m.fechaCreacion).toLocaleString()}</td>
                                            <td>{m.referencia?.substring(0, 8)}...</td>
                                            <td>
                                                <span style={{ fontSize: '0.8rem', padding: '2px 6px', borderRadius: '4px', background: '#eee', marginRight: '5px' }}>
                                                    {m.tipoOperacion.replace('TRANSFERENCIA_', '')}
                                                </span>
                                                {m.descripcion}
                                            </td>
                                            <td className={m.tipoOperacion.includes('ENTRADA') || m.tipoOperacion === 'DEPOSITO' ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                                                {m.tipoOperacion.includes('ENTRADA') || m.tipoOperacion === 'DEPOSITO' ? '+' : '-'}${m.monto}
                                            </td>
                                            <td>
                                                <button
                                                    className="btn-reversar"
                                                    onClick={() => setSelectedTx(m)}
                                                >
                                                    Solicitar Anulación
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {selectedTx && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Solicitar Anulación / Reverso</h3>
                            <p><strong>Monto a reversar:</strong> ${selectedTx.monto}</p>
                            <p><strong>Destino:</strong> {selectedTx.descripcion}</p>

                            <label className="fw-bold mt-3 d-block">Motivo de la anulación (Catálogo ISO):</label>
                            <select value={motivo} onChange={e => setMotivo(e.target.value)} className="select-motivo">
                                {motivos.map(m => (
                                    <option key={m.code} value={m.code}>{m.code} - {m.description}</option>
                                ))}
                            </select>

                            <div className="modal-actions">
                                <button className="btn-cancel" onClick={() => setSelectedTx(null)}>Cancelar</button>
                                <button className="btn-confirm" onClick={handleSolicitarReverso} disabled={procesando}>
                                    {procesando ? "Procesando..." : "Confirmar Anulación"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
