import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { realizarTransferenciaInterbancaria, getBancos } from '../services/bancaApi'
import { useNavigate } from "react-router-dom";

export default function TransaccionesInterbancarias() {
    const { state, refreshAccounts, updateAccountBalance } = useAuth();
    const navigate = useNavigate();

    // Cuentas del usuario (Manejo defensivo si aún no cargan)
    const accounts = (state && Array.isArray(state.user?.accounts) && state.user.accounts.length)
        ? state.user.accounts
        : [];

    // Si no hay cuentas, no se puede operar (o mostrar mock temporal)
    const firstAccId = accounts[0]?.id || '';

    const [step, setStep] = useState(1);
    const [toAccount, setToAccount] = useState("");
    const [bankName, setBankName] = useState("");
    const [banks, setBanks] = useState([])
    const [toName, setToName] = useState("");

    // Estado de cuenta origen seleccionada (ID interno)
    const [fromAccId, setFromAccId] = useState(firstAccId);

    // Objeto cuenta origen completo para mostrar saldo/numero
    const fromAccount = accounts.find(a => a.id === fromAccId) || accounts[0] || { number: '---', balance: 0 };

    const [amount, setAmount] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Bancos registrados en el Switch (Quemados por requerimiento)
        const hardcodedBanks = [
            { id: "NEXUS_BANK", codigo: "NEXUS_BANK", nombre: "Nexus Bank (270100)" },
            { id: "ECUSOL_BK", codigo: "ECUSOL_BK", nombre: "Ecusol Bank (370100)" },
            { id: "ARCBANK", codigo: "ARCBANK", nombre: "Arcbank (400000)" },
            { id: "BANTEC", codigo: "BANTEC", nombre: "Bantec (100000)" },
        ];

        setBanks(hardcodedBanks);

        // Si cambia la lista de cuentas y no hay seleccionada, seleccionar la primera
        if (accounts.length > 0 && !fromAccId) {
            setFromAccId(accounts[0].id)
        }
    }, [accounts])

    const goToStep2 = () => {
        if (!toAccount || !bankName || !toName)
            return setError("Todos los campos son obligatorios.");

        if (toAccount.replace(/\D/g, '').length < 6)
            return setError("El número de cuenta parece inválido.");

        setError("");
        setStep(2);
    };

    const goToStep3 = () => {
        const num = Number(amount);
        if (!num || num <= 0) return setError("Monto inválido.");

        // Validación de saldo (Opcional, el backend valida también)
        if (num > (fromAccount.balance || 0))
            return setError("Saldo insuficiente en la cuenta.");

        setError("");
        setStep(3);
    };

    const confirmTransfer = async () => {
        // En tu backend Java no usas idUsuarioWeb en el DTO de TransaccionRequest, 
        // usas idCuentaOrigen. El backend sabe de quién es la cuenta por el ID.
        if (!fromAccId) {
            return setError('Seleccione una cuenta de origen válida.');
        }

        setLoading(true);
        setError("");

        try {
            // bankName ya contiene el código del banco (ej: ARCBANK, NEXUS, PICHINCHA)
            const request = {
                tipoOperacion: "TRANSFERENCIA_SALIDA",
                idCuentaOrigen: parseInt(fromAccId), // Integer ID interno
                cuentaExterna: toAccount, // Cuenta destino en otro banco
                idBancoExterno: bankName, // Código BIC del banco
                monto: Number(amount),
                canal: "WEB",
                descripcion: `Transferencia a ${toName} - Banco ${bankName}`
            }

            const response = await realizarTransferenciaInterbancaria(request);

            // Actualización inmediata con el saldo real retornado por el backend
            if (response && response.saldoResultante !== undefined) {
                updateAccountBalance(fromAccId, response.saldoResultante);
            } else {
                // Fallback a refresh completo si el DTO no trae el saldo
                await refreshAccounts();
            }

            // Éxito
            setStep(4);

            // Opcional: Actualizar saldo localmente o recargar
            setTimeout(() => {
                navigate('/movimientos');
            }, 3000);

        } catch (err) {
            console.error(err);
            setError(err.message || 'Error en la transferencia interbancaria');
        } finally {
            setLoading(false);
        }
    };

    const downloadReceipt = () => {
        const text =
            `TRANSFERENCIA INTERBANCARIA EXITOSA\n\n` +
            `Monto: $${Number(amount).toFixed(2)}\n` +
            `Desde cuenta: ${fromAccount.number}\n` +
            `A nombre de: ${toName}\n` +
            `Cuenta destino: ${toAccount}\n` +
            `Banco destino: ${bankName}\n` +
            `Fecha: ${new Date().toLocaleString()}\n`;

        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `comprobante_interbancario_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="inter-page">
            <header className="header-inline">
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '32px', fontWeight: '800' }}>Transferencia Interbancaria</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Envía dinero a otros bancos de la red de forma segura</p>
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
                        <h2 style={styles.stepTitle}>Datos del Beneficiario</h2>

                        <div style={styles.field}>
                            <label style={styles.label}>Banco de Destino</label>
                            <select
                                className="modern-input"
                                value={bankName}
                                onChange={e => setBankName(e.target.value)}
                            >
                                <option value="">Seleccione una entidad bancaria</option>
                                {banks.map((b, i) => (
                                    <option key={b.codigo || b.id || i} value={b.codigo || b.id}>
                                        {b.nombre || b.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>Número de Cuenta</label>
                            <input
                                className="modern-input"
                                value={toAccount}
                                onChange={(e) => setToAccount(e.target.value.replace(/\D/g, ''))}
                                placeholder="Ej: 2200123456"
                            />
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>Nombre del Beneficiario</label>
                            <input
                                className="modern-input"
                                value={toName}
                                onChange={e => setToName(e.target.value)}
                                placeholder="Nombre completo"
                            />
                        </div>

                        {error && <div style={styles.errorMsg}>{error}</div>}

                        <button className="modern-btn modern-btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={goToStep2}>
                            Continuar a Monto
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="fade-in">
                        <h2 style={styles.stepTitle}>Detalles de la Transferencia</h2>

                        <div style={styles.accSelector}>
                            <label style={styles.label}>Cuenta de Origen</label>
                            <select
                                className="modern-input"
                                value={fromAccId}
                                onChange={(e) => setFromAccId(e.target.value)}
                            >
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.number} — Saldo Disponible: ${acc.balance.toFixed(2)}
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

                        <div className="premium-card" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px dashed #3b82f6', marginBottom: '24px' }}>
                            <p style={{ fontSize: '13px', color: '#1d4ed8', textAlign: 'center' }}>
                                💡 Nota: Las transferencias interbancarias pueden incurrir en una comisión de red de $0.40.
                            </p>
                        </div>

                        {error && <div style={styles.errorMsg}>{error}</div>}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="modern-btn modern-btn-outline" style={{ flex: 1 }} onClick={() => setStep(1)}>Atrás</button>
                            <button className="modern-btn modern-btn-primary" style={{ flex: 2 }} onClick={goToStep3}>Revisar Detalles</button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="fade-in">
                        <h2 style={styles.stepTitle}>Confirmar Transferencia</h2>

                        <div className="premium-card" style={{ background: 'var(--bg)', marginBottom: '24px' }}>
                            <div style={styles.confirmRow}>
                                <span>Beneficiario</span>
                                <strong>{toName}</strong>
                            </div>
                            <div style={styles.confirmRow}>
                                <span>Banco</span>
                                <strong>{bankName}</strong>
                            </div>
                            <div style={styles.confirmRow}>
                                <span>Cuenta Destino</span>
                                <strong>{toAccount}</strong>
                            </div>
                            <div style={{ ...styles.confirmRow, borderTop: '1px solid var(--border)', marginTop: '12px', paddingTop: '12px' }}>
                                <span style={{ fontSize: '16px' }}>Monto a Debitar</span>
                                <strong style={{ fontSize: '22px', color: 'var(--primary)' }}>${Number(amount).toFixed(2)}</strong>
                            </div>
                        </div>

                        {error && <div style={styles.errorMsg}>{error}</div>}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="modern-btn modern-btn-outline" style={{ flex: 1 }} onClick={() => setStep(2)} disabled={loading}>Atrás</button>
                            <button className="modern-btn modern-btn-primary" style={{ flex: 2 }} onClick={confirmTransfer} disabled={loading}>
                                {loading ? 'Enviando...' : 'Confirmar y Enviar'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="fade-in" style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '12px' }}>¡Transferencia Exitosa!</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                            Tu dinero ha sido enviado correctamente. El comprobante estará disponible en tu historial.
                        </p>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button className="modern-btn modern-btn-outline" onClick={downloadReceipt}>Descargar Recibo</button>
                            <button className="modern-btn modern-btn-primary" onClick={() => navigate('/movimientos')}>Ver Movimientos</button>
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