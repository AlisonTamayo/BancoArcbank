import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { realizarTransferencia, getCuentaPorNumero } from '../services/bancaApi';
import { useNavigate } from "react-router-dom";

export default function Transfer() {
    const { state, refreshAccounts, updateAccountBalance } = useAuth();
    const navigate = useNavigate();

    const accounts = state?.user?.accounts || [];
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [toAccountNum, setToAccountNum] = useState("");
    const [toName, setToName] = useState("");
    const [fromAccId, setFromAccId] = useState(accounts[0]?.id || "");
    const [amount, setAmount] = useState("");
    const [destAccountObj, setDestAccountObj] = useState(null);

    useEffect(() => {
        if (accounts.length > 0 && !fromAccId) setFromAccId(accounts[0].id);
    }, [accounts]);

    const validateDest = async () => {
        if (!toAccountNum || !toName) return setError("ESPECIFIQUE DATOS DEL BENEFICIARIO");
        setLoading(true);
        try {
            const resp = await getCuentaPorNumero(toAccountNum);
            if (!resp || !resp.idCuenta) throw new Error("INSTRUMENTO DESTINO NO IDENTIFICADO");
            if (String(resp.idCuenta) === String(fromAccId)) throw new Error("ORIGEN Y DESTINO NO PUEDEN SER IDÉNTICOS");
            setDestAccountObj(resp);
            setStep(2);
            setError("");
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const confirm = async () => {
        setLoading(true);
        try {
            const req = {
                tipoOperacion: "TRANSFERENCIA_INTERNA",
                idCuentaOrigen: Number(fromAccId),
                idCuentaDestino: destAccountObj.idCuenta,
                monto: Number(amount),
                canal: "WEB_PRESTIGE",
                descripcion: `ELITE TRANSFER TO ${toName}`,
                idSucursal: 1
            };
            const res = await realizarTransferencia(req);
            if (res?.saldoResultante !== undefined) updateAccountBalance(fromAccId, res.saldoResultante);
            else await refreshAccounts();
            setStep(3);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    if (accounts.length === 0) return <div style={{ color: 'var(--gold-primary)', padding: '100px', textAlign: 'center' }}>NO SE DETECTAN INSTRUMENTOS ACTIVOS.</div>;

    return (
        <div className="main-content fade-in">
            <header style={{ marginBottom: '60px' }}>
                <h2 style={{ fontSize: '12px', letterSpacing: '8px', color: 'var(--gold-primary)', marginBottom: '10px' }}>PROTOCOLOS DE TRANSFERENCIA</h2>
                <h1 className="title-xl">Movimiento de Capital</h1>
            </header>

            <div style={styles.stepper}>
                {[1, 2, 3].map(s => (
                    <div key={s} style={{
                        ...styles.step,
                        borderColor: step >= s ? 'var(--gold-primary)' : '#222',
                        color: step >= s ? 'var(--gold-primary)' : '#222'
                    }}>
                        PASO 0{s}
                    </div>
                ))}
            </div>

            <div className="premium-card" style={styles.formContainer}>
                {step === 1 && (
                    <div>
                        <h3 style={styles.cardTitle}>IDENTIFICACIÓN DE DESTINO</h3>
                        <div style={styles.field}>
                            <label className="label-text">CUENTA BENEFICIARIA</label>
                            <input
                                className="modern-input"
                                value={toAccountNum}
                                onChange={e => setToAccountNum(e.target.value)}
                                placeholder="NÚMERO DE CUENTA..."
                            />
                        </div>
                        <div style={styles.field}>
                            <label className="label-text">TITULAR DEL ACTIVO</label>
                            <input
                                className="modern-input"
                                value={toName}
                                onChange={e => setToName(e.target.value)}
                                placeholder="NOMBRE COMPLETO..."
                            />
                        </div>
                        {error && <div style={styles.error}>{error}</div>}
                        <button className="modern-btn" style={{ width: '100%', marginTop: '30px' }} onClick={validateDest} disabled={loading}>
                            {loading ? 'VERIFICANDO...' : 'INICIAR PROTOCOLO'}
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <h3 style={styles.cardTitle}>CONFIGURACIÓN DE MONTO</h3>
                        <div style={styles.field}>
                            <label className="label-text">ORIGEN DE FONDOS</label>
                            <select className="modern-input" value={fromAccId} onChange={e => setFromAccId(e.target.value)}>
                                {accounts.map(a => (
                                    <option key={a.id} value={a.id}>{a.number} — SALDO: ${a.balance.toFixed(2)}</option>
                                ))}
                            </select>
                        </div>
                        <div style={styles.field}>
                            <label className="label-text">VALOR A TRANSFERIR ($)</label>
                            <input
                                className="modern-input"
                                style={{ fontSize: '32px', textAlign: 'center', fontWeight: '900', color: 'var(--gold-primary)' }}
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                        {error && <div style={styles.error}>{error}</div>}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', marginTop: '30px' }}>
                            <button className="modern-btn modern-btn-outline" onClick={() => setStep(1)}>VOLVER</button>
                            <button className="modern-btn" onClick={confirm} disabled={loading}>
                                {loading ? 'PROCESANDO...' : 'CONFIRMAR OPERACIÓN'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div style={{ fontSize: '80px', marginBottom: '20px' }}>🏆</div>
                        <h2 style={{ fontSize: '24px', letterSpacing: '4px', marginBottom: '15px' }}>TRANSFERENCIA EXITOSA</h2>
                        <p style={{ color: 'var(--text-dim)', marginBottom: '40px' }}>Los fondos han sido relocalizados siguiendo los protocolos de seguridad de ARCBANK.</p>
                        <button className="modern-btn" onClick={() => navigate('/movimientos')}>VER LIBRO MAYOR</button>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    stepper: {
        display: 'flex',
        gap: '20px',
        marginBottom: '40px',
        justifyContent: 'center',
    },
    step: {
        padding: '10px 30px',
        border: '1px solid',
        fontSize: '11px',
        fontWeight: '900',
        letterSpacing: '3px',
        borderRadius: '2px',
    },
    formContainer: {
        maxWidth: '650px',
        margin: '0 auto',
        padding: '60px',
    },
    cardTitle: {
        fontSize: '18px',
        letterSpacing: '2px',
        marginBottom: '40px',
        textAlign: 'center',
        fontWeight: '800',
    },
    field: {
        marginBottom: '25px',
    },
    error: {
        background: 'rgba(255, 77, 77, 0.1)',
        color: 'var(--error-glow)',
        padding: '15px',
        fontSize: '11px',
        fontWeight: '800',
        textAlign: 'center',
        border: '1px solid var(--error-glow)',
        marginTop: '20px',
    }
};