import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { realizarTransferencia, getCuentaPorNumero } from '../services/bancaApi';
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiCheckCircle, FiShield } from "react-icons/fi";

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
        if (!toAccountNum || !toName) return setError("Complete los campos obligatorios");
        setLoading(true);
        try {
            const resp = await getCuentaPorNumero(toAccountNum);
            if (!resp || !resp.idCuenta) throw new Error("Instrumento de destino no localizado");
            if (String(resp.idCuenta) === String(fromAccId)) throw new Error("No puede transferir al mismo origen");
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
                canal: "WEB_LUXURY",
                descripcion: `TRF INTERNA: ${toName}`,
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

    return (
        <div className="main-container animate-slide-up">
            <header className="mb-5">
                <h5 className="text-warning fw-bold mb-2" style={{ letterSpacing: '4px' }}>OPERACIONES DIRECTAS</h5>
                <h1 className="display-5 fw-bold text-white">Transferencia <span className="gold-text">Inmediata</span></h1>
            </header>

            <div className="row justify-content-center">
                <div className="col-12 col-md-8 col-xl-6">
                    <div className="glass-panel p-5">
                        {/* STEPPER */}
                        <div className="d-flex justify-content-between mb-5 position-relative">
                            <div className="position-absolute top-50 start-0 translate-middle-y w-100" style={{ height: '2px', background: 'rgba(212,175,55,0.2)', zIndex: 1 }}></div>
                            {[1, 2, 3].map(s => (
                                <div key={s} className={`rounded-circle d-flex align-items-center justify-content-center fw-bold position-relative`} style={{
                                    width: '40px', height: '40px',
                                    background: step >= s ? 'var(--gold-gradient)' : 'var(--dark-surface)',
                                    color: step >= s ? '#000' : '#666',
                                    border: '2px solid',
                                    borderColor: step >= s ? 'var(--gold-primary)' : 'rgba(212,175,55,0.2)',
                                    zIndex: 2
                                }}>
                                    {step > s ? <FiCheckCircle /> : s}
                                </div>
                            ))}
                        </div>

                        {step === 1 && (
                            <div className="animate-slide-up">
                                <div className="text-center mb-4">
                                    <FiShield size={40} className="text-warning mb-3" />
                                    <h4 className="fw-bold">DATOS DEL BENEFICIARIO</h4>
                                </div>
                                <div className="mb-4">
                                    <label className="label-text">IDENTIFICADOR DE CUENTA</label>
                                    <input className="form-control form-control-luxury" value={toAccountNum} onChange={e => setToAccountNum(e.target.value)} placeholder="000000000000" />
                                </div>
                                <div className="mb-4">
                                    <label className="label-text">NOMBRE DEL TITULAR</label>
                                    <input className="form-control form-control-luxury" value={toName} onChange={e => setToName(e.target.value)} placeholder="Ej: Diana Prince" />
                                </div>
                                {error && <div className="alert alert-danger glass-panel border-danger text-danger py-2 mb-4 text-center small fw-bold">{error}</div>}
                                <button className="btn btn-primary w-100 py-3" onClick={validateDest} disabled={loading}>
                                    {loading ? 'BLOQUEANDO CANAL...' : 'VERIFICAR Y CONTINUAR'}
                                </button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="animate-slide-up">
                                <div className="text-center mb-4">
                                    <h4 className="fw-bold">CONFIGURACIÓN DEL ENVÍO</h4>
                                </div>
                                <div className="mb-4">
                                    <label className="label-text">CUENTA DE ORIGEN</label>
                                    <select className="form-control form-control-luxury" value={fromAccId} onChange={e => setFromAccId(e.target.value)}>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.number} — SALDO: ${a.balance.toFixed(2)}</option>)}
                                    </select>
                                </div>
                                <div className="mb-4 text-center">
                                    <label className="label-text">VALOR A TRANSFERIR</label>
                                    <div className="display-4 fw-bold text-white mb-3">
                                        <span className="text-warning">$</span>
                                        <input type="number" step="0.01" className="bg-transparent border-0 text-white text-center w-75 fw-bold" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" style={{ outline: 'none' }} />
                                    </div>
                                </div>
                                {error && <div className="alert alert-danger glass-panel border-danger text-danger py-2 mb-4 text-center small fw-bold">{error}</div>}
                                <div className="row g-3">
                                    <div className="col-4">
                                        <button className="btn btn-outline-gold w-100 py-3" onClick={() => setStep(1)}><FiArrowLeft /></button>
                                    </div>
                                    <div className="col-8">
                                        <button className="btn btn-primary w-100 py-3" onClick={confirm} disabled={loading}>
                                            {loading ? 'TRANSMITIENDO...' : 'CONFIRMAR PAGO'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="text-center animate-slide-up py-4">
                                <div className="display-1 text-warning mb-4"><FiCheckCircle /></div>
                                <h2 className="fw-bold mb-3">OPERACIÓN EXITOSA</h2>
                                <p className="text-muted mb-5">La transferencia ha sido procesada y reflejada en los sistemas de CRB de ARCBANK.</p>
                                <button className="btn btn-primary px-5 py-3" onClick={() => navigate('/movimientos')}>VOLVER A MIS MOVIMIENTOS</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}