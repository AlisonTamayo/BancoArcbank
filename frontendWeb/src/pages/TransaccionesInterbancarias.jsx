import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { realizarTransferenciaInterbancaria } from "../services/bancaApi";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiCheckCircle, FiGlobe } from "react-icons/fi";

export default function Interbank() {
    const { state, refreshAccounts, updateAccountBalance } = useAuth();
    const navigate = useNavigate();

    const accounts = state?.user?.accounts || [];
    const [step, setStep] = useState(1);
    const [toInfo, setToInfo] = useState({ account: "", bank: "", name: "" });
    const [fromAccId, setFromAccId] = useState(accounts[0]?.id || "");
    const [amount, setAmount] = useState("");
    const [banks, setBanks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        // Bancos registrados en el Switch (Quemados por requerimiento)
        const hardcodedBanks = [
            { id: "NEXUS_BANK", codigo: "NEXUS_BANK", nombre: "Nexus Bank (270100)", bin: "270100" },
            { id: "ECUSOL_BK", codigo: "ECUSOL_BK", nombre: "Ecusol Bank (370100)", bin: "370100" },
            { id: "BANTEC", codigo: "BANTEC", nombre: "Bantec (100000)", bin: "100000" },
        ];
        setBanks(hardcodedBanks);

        if (accounts.length > 0 && !fromAccId) setFromAccId(accounts[0].id);
    }, [accounts.length, fromAccId]);

    const handleConfirm = async () => {
        setLoading(true);
        setError("");
        if (!amount || Number(amount) <= 0) {
            setError("El monto debe ser mayor a 0.");
            setLoading(false);
            return;
        }
        try {
            const selectedBank = banks.find(b => b.codigo === toInfo.bank);

            // Reverted to Flat Structure as required by backend API Contract
            const req = {
                tipoOperacion: "TRANSFERENCIA_INTERBANCARIA",
                idCuentaOrigen: Number(fromAccId),
                idCuentaDestino: null,
                monto: Number(amount),
                canal: "WEB_LUXURY",
                descripcion: `RED INT: ${selectedBank?.nombre || toInfo.bank} - REF: ${toInfo.name}`,
                idSucursal: 1,
                cuentaExterna: toInfo.account,
                idBancoExterno: selectedBank?.codigo || toInfo.bank,
                nombreDestinatario: toInfo.name
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
        <div className="animate-slide-up">
            <header className="mb-5">
                <h5 className="text-warning fw-bold mb-2" style={{ letterSpacing: '4px' }}>RED BANCARIA</h5>
                <h1 className="display-5 fw-bold text-white">Transferencia <span className="gold-text">Interbancaria</span></h1>
            </header>

            <div className="row justify-content-center">
                <div className="col-12 col-md-8 col-xl-6">
                    <div className="glass-panel p-5">
                        {/* STEPPER */}
                        <div className="d-flex justify-content-between mb-5 position-relative">
                            <div className="position-absolute top-50 start-0 translate-middle-y w-100" style={{ height: '2px', background: 'rgba(212,175,55,0.2)', zIndex: 1 }}></div>
                            {[1, 2, 3].map(s => (
                                <div key={s} className="rounded-circle d-flex align-items-center justify-content-center fw-bold position-relative" style={{
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
                                    <FiGlobe size={40} className="text-warning mb-3" />
                                    <h4 className="fw-bold">DESTINO INTERBANCARIO</h4>
                                </div>
                                <div className="mb-4">
                                    <label className="label-text">INSTITUCIÓN FINANCIERA</label>
                                    <select className="form-control form-control-luxury" value={toInfo.bank} onChange={e => setToInfo({ ...toInfo, bank: e.target.value })}>
                                        <option value="">Seleccione banco receptor...</option>
                                        {banks.map(b => (
                                            <option key={b.codigo} value={b.codigo}>
                                                {b.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mb-4">
                                    <label className="label-text">NÚMERO DE CUENTA</label>
                                    <input className="form-control form-control-luxury" value={toInfo.account} onChange={e => setToInfo({ ...toInfo, account: e.target.value })} placeholder="X-XXXX-XXXXX" />
                                </div>
                                <div className="mb-4">
                                    <label className="label-text">BENEFICIARIO (NOMBRES)</label>
                                    <input className="form-control form-control-luxury" value={toInfo.name} onChange={e => setToInfo({ ...toInfo, name: e.target.value })} placeholder="Ej: Bruce Wayne" />
                                </div>
                                <button className="btn btn-primary w-100 py-3 d-flex align-items-center justify-content-center gap-2" onClick={() => setStep(2)}>
                                    SIGUIENTE PASO <FiArrowRight />
                                </button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="animate-slide-up">
                                <div className="text-center mb-4">
                                    <h4 className="fw-bold">CONFIRMACIÓN DE FONDOS</h4>
                                </div>
                                <div className="mb-4">
                                    <label className="label-text">CUENTA DE ORIGEN (ARCBANK)</label>
                                    <select className="form-control form-control-luxury" value={fromAccId} onChange={e => setFromAccId(e.target.value)}>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.number} — SALDO: ${a.balance.toFixed(2)}</option>)}
                                    </select>
                                </div>
                                <div className="mb-4 text-center">
                                    <label className="label-text text-warning">VALOR DEL ENVÍO</label>
                                    <div className="display-4 fw-bold text-white mb-2">
                                        <span className="text-warning">$</span>
                                        <input type="number" step="0.01" className="bg-transparent border-0 text-white text-center w-75 fw-bold" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" style={{ outline: 'none' }} />
                                    </div>
                                    <small className="text-muted small">Costo por servicio: $0.00 (Tarifa Premium)</small>
                                </div>
                                {error && <div className="alert alert-danger glass-panel border-danger text-danger py-2 mb-4 text-center small fw-bold">{error}</div>}
                                <div className="row g-3">
                                    <div className="col-4">
                                        <button className="btn btn-outline-gold w-100 py-3" onClick={() => setStep(1)}><FiArrowLeft /></button>
                                    </div>
                                    <div className="col-8">
                                        <button className="btn btn-primary w-100 py-3 fw-bold" onClick={handleConfirm} disabled={loading}>
                                            {loading ? 'MODULANDO CAPITAL...' : 'EJECUTAR TRANSFERENCIA'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="text-center animate-slide-up py-4">
                                <div className="display-1 text-warning mb-4"><FiCheckCircle /></div>
                                <h2 className="fw-bold mb-3">ENVÍO REGISTRADO</h2>
                                <p className="text-muted mb-5">La solicitud ha sido enviada a la cámara de compensación satisfactoriamente.</p>
                                <button className="btn btn-primary px-5 py-3" onClick={() => navigate('/movimientos')}>VOLVER AL PANEL CENTRAL</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}