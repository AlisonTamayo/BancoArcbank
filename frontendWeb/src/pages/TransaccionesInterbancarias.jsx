import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { realizarTransferenciaInterbancaria } from "../services/bancaApi";
import { useNavigate } from "react-router-dom";

export default function Interbank() {
    const { state, refreshAccounts, updateAccountBalance } = useAuth();
    const navigate = useNavigate();

    const accounts = state?.user?.accounts || [];
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [toInfo, setToInfo] = useState({ account: "", bank: "", name: "" });
    const [fromAccId, setFromAccId] = useState(accounts[0]?.id || "");
    const [amount, setAmount] = useState("");

    const banks = ["BANCO PICHINCHA", "BANCO GUAYAQUIL", "BANCO DEL PACIFICO", "PRODUBANCO"];

    useEffect(() => {
        if (accounts.length > 0 && !fromAccId) setFromAccId(accounts[0].id);
    }, [accounts]);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            const req = {
                tipoOperacion: "TRANSFERENCIA_INTERBANCARIA",
                idCuentaOrigen: Number(fromAccId),
                idCuentaDestino: 0,
                monto: Number(amount),
                canal: "WEB_PRESTIGE",
                descripcion: `RED EXTERNA: ${toInfo.bank} - ${toInfo.name}`,
                idSucursal: 1,
                detalles: { bancoDestino: toInfo.bank, cuentaDestinoExterno: toInfo.account, nombreDestinatario: toInfo.name }
            };
            const res = await realizarTransferenciaInterbancaria(req);
            if (res?.saldoResultante !== undefined) updateAccountBalance(fromAccId, res.saldoResultante);
            else await refreshAccounts();
            setStep(3);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="main-content fade-in">
            <header style={{ marginBottom: '60px' }}>
                <h2 style={{ fontSize: '12px', letterSpacing: '8px', color: 'var(--gold-primary)', marginBottom: '10px' }}>CONEXIÓN RED EXTERNA</h2>
                <h1 className="title-xl">Interbancaria Elite</h1>
            </header>

            <div style={styles.stepper}>
                {[1, 2, 3].map(s => (
                    <div key={s} style={{
                        ...styles.step,
                        borderColor: step >= s ? 'var(--gold-primary)' : '#222',
                        color: step >= s ? 'var(--gold-primary)' : '#222'
                    }}>PASO 0{s}</div>
                ))}
            </div>

            <div className="premium-card" style={styles.formContainer}>
                {step === 1 && (
                    <div>
                        <h3 style={styles.cardTitle}>DATOS DEL RECEPTOR</h3>
                        <div style={styles.field}>
                            <label className="label-text">BANCO DE DESTINO</label>
                            <select className="modern-input" value={toInfo.bank} onChange={e => setToInfo({ ...toInfo, bank: e.target.value })}>
                                <option value="">SELECCIONAR INSTITUCIÓN...</option>
                                {banks.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                        <div style={styles.field}>
                            <label className="label-text">CUENTA DESTINO</label>
                            <input className="modern-input" value={toInfo.account} onChange={e => setToInfo({ ...toInfo, account: e.target.value })} placeholder="X-XXXX-XXXXX" />
                        </div>
                        <div style={styles.field}>
                            <label className="label-text">NOMBRE DEL BENEFICIARIO</label>
                            <input className="modern-input" value={toInfo.name} onChange={e => setToInfo({ ...toInfo, name: e.target.value })} placeholder="IDENTIDAD COMPLETA" />
                        </div>
                        <button className="modern-btn" style={{ width: '100%', marginTop: '20px' }} onClick={() => setStep(2)}>CONTINUAR</button>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <h3 style={styles.cardTitle}>VERIFICACIÓN DE FONDOS</h3>
                        <div style={styles.field}>
                            <label className="label-text">INSTRUMENTO DE ORIGEN</label>
                            <select className="modern-input" value={fromAccId} onChange={e => setFromAccId(e.target.value)}>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.number} — ${a.balance.toFixed(2)}</option>)}
                            </select>
                        </div>
                        <div style={styles.field}>
                            <label className="label-text">VALOR A TRANSFERIR ($)</label>
                            <input className="modern-input" style={{ fontSize: '32px', textAlign: 'center', fontWeight: '900', color: 'var(--gold-primary)' }} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                        </div>
                        {error && <div style={styles.error}>{error}</div>}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px' }}>
                            <button className="modern-btn modern-btn-outline" onClick={() => setStep(1)}>VOLVER</button>
                            <button className="modern-btn" onClick={handleConfirm} disabled={loading}>{loading ? 'TRANSMITIENDO...' : 'EJECUTAR ENVÍO'}</button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '80px', marginBottom: '20px' }}>🌐</div>
                        <h2 style={{ fontSize: '24px', letterSpacing: '4px', marginBottom: '15px' }}>SOLICITUD PROCESADA</h2>
                        <p style={{ color: 'var(--text-dim)', marginBottom: '40px' }}>La transferencia interbancaria ha sido enviada a la cámara de compensación.</p>
                        <button className="modern-btn" onClick={() => navigate('/movimientos')}>VOLVER AL PANEL</button>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    stepper: { display: 'flex', gap: '20px', marginBottom: '40px', justifyContent: 'center' },
    step: { padding: '10px 30px', border: '1px solid', fontSize: '11px', fontWeight: '900', letterSpacing: '3px', borderRadius: '2px' },
    formContainer: { maxWidth: '650px', margin: '0 auto', padding: '60px' },
    cardTitle: { fontSize: '18px', letterSpacing: '2px', marginBottom: '40px', textAlign: 'center', fontWeight: '800' },
    field: { marginBottom: '25px' },
    error: { background: 'rgba(255, 77, 77, 0.1)', color: 'var(--error-glow)', padding: '15px', fontSize: '11px', fontWeight: '800', textAlign: 'center', border: '1px solid var(--error-glow)', marginTop: '20px' }
};