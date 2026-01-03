import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { realizarTransferencia, getCuentaPorNumero } from '../services/bancaApi' // Importamos getCuentaPorNumero
import { useNavigate } from "react-router-dom";

export default function Transfer() {
    const { state, refreshAccounts, updateAccountBalance } = useAuth();
    const navigate = useNavigate();

    // 1. Cargar cuentas origen del usuario
    const accounts = (state && Array.isArray(state.user?.accounts) && state.user.accounts.length)
        ? state.user.accounts
        : [];

    const [step, setStep] = useState(1);

    // Campos formulario
    const [toAccountNum, setToAccountNum] = useState("");
    const [toName, setToName] = useState("");

    // Cuenta Origen
    const [fromAccId, setFromAccId] = useState(accounts[0]?.id || '');
    const fromAccount = accounts.find(a => a.id === fromAccId) || accounts[0] || { number: '', balance: 0 };

    // Cuenta Destino (Objeto completo obtenido del backend)
    const [destAccountObj, setDestAccountObj] = useState(null);

    const [amount, setAmount] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Efecto para seleccionar cuenta por defecto si cambia la lista
    useEffect(() => {
        if (accounts.length > 0 && !fromAccId) setFromAccId(accounts[0].id);
    }, [accounts]);

    const goToStep2 = async () => {
        setError("");

        if (!toAccountNum || !toName) return setError("Todos los campos son obligatorios.");

        // Transferencias internas - siempre mismo banco (ARCBANK)

        // --- VALIDACIÓN DE CUENTA DESTINO ---
        setLoading(true);
        try {
            // Buscamos la cuenta destino en el backend para obtener su ID interno
            const cuentaDestino = await getCuentaPorNumero(toAccountNum);

            if (!cuentaDestino || !cuentaDestino.idCuenta) {
                throw new Error("La cuenta destino no existe en ARCBANK.");
            }

            // Validar que no se transfiera a sí mismo
            if (String(cuentaDestino.idCuenta) === String(fromAccId)) {
                throw new Error("No puede transferir a la misma cuenta de origen.");
            }

            setDestAccountObj(cuentaDestino); // Guardamos para el paso final
            setStep(2);

        } catch (e) {
            setError(e.message || "Error validando cuenta destino.");
        } finally {
            setLoading(false);
        }
    };

    const goToStep3 = () => {
        const num = Number(amount);
        if (!num || num <= 0) return setError("Monto inválido.");
        if (num > fromAccount.balance) return setError("Saldo insuficiente.");

        setError("");
        setStep(3);
    };

    const confirmTransfer = async () => {
        if (!fromAccId || !destAccountObj?.idCuenta) {
            return setError('Datos de cuenta inválidos.');
        }

        setLoading(true);
        try {
            // Payload exacto para TransaccionRequestDTO
            const request = {
                tipoOperacion: "TRANSFERENCIA_INTERNA",
                idCuentaOrigen: Number(fromAccId), // ID Integer
                idCuentaDestino: destAccountObj.idCuenta, // ID Integer (obtenido en paso 1)
                monto: Number(amount),
                canal: "WEB",
                descripcion: `Transferencia a ${toName}`,
                idSucursal: 1 // Default Web
            }

            const response = await realizarTransferencia(request);

            // Actualización inmediata con el saldo real retornado por el backend
            if (response && response.saldoResultante !== undefined) {
                updateAccountBalance(fromAccId, response.saldoResultante);
            } else {
                // Fallback a refresh completo si el DTO no trae el saldo
                await refreshAccounts();
            }

            setStep(4);
            setTimeout(() => { navigate('/movimientos'); }, 3000);

        } catch (err) {
            setError(err.message || 'Error realizando la transferencia.');
        } finally {
            setLoading(false);
        }
    };

    const downloadReceipt = () => {
        const text =
            `TRANSFERENCIA EXITOSA\n\n` +
            `Monto: $${Number(amount).toFixed(2)}\n` +
            `Origen: ${fromAccount.number}\n` +
            `Destino: ${toAccountNum} (${toName})\n` +
            `Fecha: ${new Date().toLocaleString()}\n`;

        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `comprobante_transferencia_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (accounts.length === 0) {
        return <div style={{ padding: 30 }}>No tiene cuentas activas para realizar transferencias.</div>;
    }

    return (
        <div className="transfer-page">
            <header className="header-inline">
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '32px', fontWeight: '800' }}>Transferencia Directa</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Envía dinero al instante entre cuentas ARCBANK</p>
                </div>
            </header>

            <div style={styles.stepperContainer}>
                {[1, 2, 3].map(s => (
                    <React.Fragment key={s}>
                        <div style={{
                            ...styles.step,
                            background: step >= s ? 'var(--primary-gradient)' : '#e2e8f0',
                            color: step >= s ? '#fff' : 'var(--text-muted)'
                        }}>{s}</div>
                        {s < 3 && <div style={{ ...styles.stepLine, background: step > s ? 'var(--primary)' : '#e2e8f0' }}></div>}
                    </React.Fragment>
                ))}
            </div>

            <div className="premium-card" style={styles.formCard}>
                {step === 1 && (
                    <div className="fade-in">
                        <h2 style={styles.stepTitle}>Destinatario Arcbank</h2>

                        <div style={styles.field}>
                            <label style={styles.label}>Número de Cuenta Destino</label>
                            <input
                                className="modern-input"
                                value={toAccountNum}
                                maxLength={12}
                                onChange={(e) => setToAccountNum(e.target.value.replace(/\D/g, ""))}
                                placeholder="Ej: 1000123456"
                            />
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>Nombre del Beneficiario</label>
                            <input
                                className="modern-input"
                                value={toName}
                                onChange={e => setToName(e.target.value)}
                                placeholder="Nombre completo del titular"
                            />
                        </div>

                        {error && <div style={styles.errorMsg}>{error}</div>}

                        <button className="modern-btn modern-btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={goToStep2} disabled={loading}>
                            {loading ? 'Validando Cuenta...' : 'Verificar y Continuar'}
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="fade-in">
                        <h2 style={styles.stepTitle}>Detalles del Envío</h2>

                        <div style={styles.accSelector}>
                            <label style={styles.label}>Desde mi cuenta</label>
                            <select
                                className="modern-input"
                                value={fromAccId}
                                onChange={(e) => setFromAccId(e.target.value)}
                            >
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.number} — Disp: ${acc.balance.toFixed(2)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>Monto a Enviar ($)</label>
                            <input
                                className="modern-input"
                                style={{ fontSize: '28px', fontWeight: '800', textAlign: 'center', color: 'var(--primary)' }}
                                value={amount}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (/^\d*\.?\d{0,2}$/.test(val)) setAmount(val);
                                }}
                                placeholder="0.00"
                            />
                        </div>

                        <div className="premium-card" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px dashed #10b981', marginBottom: '24px' }}>
                            <p style={{ fontSize: '13px', color: '#047857', textAlign: 'center' }}>
                                ✨ Transferencia inmediata y sin costo adicional.
                            </p>
                        </div>

                        {error && <div style={styles.errorMsg}>{error}</div>}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="modern-btn modern-btn-outline" style={{ flex: 1 }} onClick={() => setStep(1)}>Atrás</button>
                            <button className="modern-btn modern-btn-primary" style={{ flex: 2 }} onClick={goToStep3}>Continuar</button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="fade-in">
                        <h2 style={styles.stepTitle}>Confirmar Operación</h2>

                        <div className="premium-card" style={{ background: 'var(--bg)', marginBottom: '24px' }}>
                            <div style={styles.confirmRow}>
                                <span>Destinatario</span>
                                <strong>{toName}</strong>
                            </div>
                            <div style={styles.confirmRow}>
                                <span>Cuenta Destino</span>
                                <strong>{toAccountNum}</strong>
                            </div>
                            <div style={styles.confirmRow}>
                                <span>Institución</span>
                                <strong>ARCBANK</strong>
                            </div>
                            <div style={{ ...styles.confirmRow, borderTop: '1px solid var(--border)', marginTop: '12px', paddingTop: '12px' }}>
                                <span style={{ fontSize: '16px' }}>Monto a Transferir</span>
                                <strong style={{ fontSize: '22px', color: 'var(--primary)' }}>${Number(amount).toFixed(2)}</strong>
                            </div>
                        </div>

                        {error && <div style={styles.errorMsg}>{error}</div>}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="modern-btn modern-btn-outline" style={{ flex: 1 }} onClick={() => setStep(2)} disabled={loading}>Atrás</button>
                            <button className="modern-btn modern-btn-primary" style={{ flex: 2 }} onClick={confirmTransfer} disabled={loading}>
                                {loading ? 'Procesando...' : 'Confirmar Transferencia'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="fade-in" style={{ textAlign: 'center', padding: '20px 0', position: 'relative' }}>
                        <div style={{ fontSize: '64px', marginBottom: '16px' }}>💸</div>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '12px' }}>¡Envío Realizado!</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                            La transferencia se ha completado con éxito. El dinero ya está disponible en la cuenta destino.
                        </p>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button className="modern-btn modern-btn-outline" onClick={downloadReceipt}>Descargar Comprobante</button>
                            <button className="modern-btn modern-btn-primary" onClick={() => navigate('/movimientos')}>Ver Actividad</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    stepperContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '40px',
        marginBottom: '40px',
    },
    step: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        fontSize: '14px',
        transition: 'all 0.3s ease',
    },
    stepLine: {
        width: '80px',
        height: '2px',
        margin: '0 10px',
    },
    formCard: {
        maxWidth: '600px',
        margin: '0 auto',
        padding: '40px',
    },
    stepTitle: {
        fontSize: '22px',
        fontWeight: '800',
        marginBottom: '32px',
        textAlign: 'center',
    },
    field: {
        marginBottom: '20px',
    },
    label: {
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        color: 'var(--text-muted)',
        marginBottom: '8px',
    },
    errorMsg: {
        background: 'rgba(239, 68, 68, 0.05)',
        color: 'var(--error)',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '13px',
        marginBottom: '20px',
        border: '1px solid rgba(239, 68, 68, 0.1)',
        textAlign: 'center',
    },
    accSelector: {
        marginBottom: '32px',
    },
    confirmRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        fontSize: '14px',
    }
};