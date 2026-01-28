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

    useEffect(() => {
        if (!cuenta) {
            navigate('/devoluciones/buscar');
            return;
        }
        cargarMovimientos();
        cargarMotivos();
    }, []);

    const cargarMovimientos = async () => {
        try {
            // Asumimos que existe un endpoint para traer por ID de cuenta igual que en la web
            // Si no existe, usamos api.request directo
            setLoading(true);
            const data = await transacciones.getPorCuenta(cuenta.id);

            // FIltrar solo las reversibles: 
            // 1. Entradas (Interbancarias o Internas)
            // 2. Menos de 24 horas
            // 3. No reversadas aun
            const filtradas = data.filter(m => {
                const esEntrada = ['TRANSFERENCIA_ENTRADA', 'DEPOSITO'].includes(m.tipoOperacion);
                const fechaOp = new Date(m.fechaCreacion);
                const hoy = new Date();
                const diffHoras = (hoy - fechaOp) / 36e5;
                const estadoValido = !['REVERSADA', 'DEVUELTA'].includes(m.estado);

                return esEntrada && diffHoras < 24 && estadoValido;
            });

            setMovimientos(filtradas.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion)));
        } catch (error) {
            console.error(error);
            alert("Error cargando movimientos");
        } finally {
            setLoading(false);
        }
    };

    const cargarMotivos = async () => {
        try {
            const lista = await transacciones.getMotivosDevolucion();
            setMotivos(lista.length ? lista : [{ code: 'FRAD', description: 'Fraude' }, { code: 'MD01', description: 'Duplicado' }]);
        } catch (e) { console.warn(e); }
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
                                            <td>{m.descripcion}</td>
                                            <td className="text-success fw-bold">+${m.monto}</td>
                                            <td>
                                                <button
                                                    className="btn-reversar"
                                                    onClick={() => setSelectedTx(m)}
                                                >
                                                    Solicitar Devolución
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
                            <h3>Confirmar Devolución</h3>
                            <p><strong>Monto a devolver:</strong> ${selectedTx.monto}</p>
                            <p><strong>Origen:</strong> {selectedTx.descripcion}</p>

                            <label>Motivo:</label>
                            <select value={motivo} onChange={e => setMotivo(e.target.value)} className="select-motivo">
                                {motivos.map(m => (
                                    <option key={m.code} value={m.code}>{m.description} ({m.code})</option>
                                ))}
                            </select>

                            <div className="modal-actions">
                                <button className="btn-cancel" onClick={() => setSelectedTx(null)}>Cancelar</button>
                                <button className="btn-confirm" onClick={handleSolicitarReverso} disabled={procesando}>
                                    {procesando ? "Procesando..." : "Confirmar Reverso"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
