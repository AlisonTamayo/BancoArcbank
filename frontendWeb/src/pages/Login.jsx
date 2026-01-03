import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { loginExitoso, crearCuentaWeb } from "../services/bancaApi";
import { useNavigate } from "react-router-dom";
import { FiLock, FiUser, FiArrowRight, FiShield } from "react-icons/fi";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [identificacion, setIdentificacion] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await crearCuentaWeb({ identificacion, password, name, tipoIdentificacion: "CEDULA" });
        setIsRegister(false);
        setError("Cuenta verificada. Proceda con su acceso.");
      } else {
        const user = await loginExitoso(identificacion, password);
        authLogin(user);
        navigate("/");
      }
    } catch (err) {
      setError(err.message || "Credenciales no autorizadas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center" style={styles.pageBg}>
      <div className="glass-panel p-5 animate-slide-up" style={styles.loginCard}>
        <div className="text-center mb-5">
          <div className="d-inline-flex p-3 rounded-circle mb-3" style={{ background: 'var(--gold-gradient)' }}>
            <FiShield size={32} color="#000" />
          </div>
          <h1 className="gold-text display-5 fw-bold mb-0" style={{ letterSpacing: '6px' }}>ARCBANK</h1>
          <p className="text-muted small fw-bold" style={{ letterSpacing: '3px' }}>LUXURY DIGITAL BANKING</p>
        </div>

        <h3 className="text-center mb-4 fw-light text-white-50" style={{ letterSpacing: '1px' }}>
          {isRegister ? "SOLICITAR ACCESO" : "SISTEMA DE ACCESO"}
        </h3>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="mb-4">
              <label className="label-text">NOMBRE COMPLETO</label>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: 'var(--glass-border)' }}>
                  <FiUser className="text-warning" />
                </span>
                <input
                  className="form-control form-control-luxury border-start-0"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Titular de la cuenta"
                  required
                />
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="label-text">IDENTIFICACIÓN (DNI)</label>
            <div className="input-group">
              <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: 'var(--glass-border)' }}>
                <FiUser className="text-warning" />
              </span>
              <input
                className="form-control form-control-luxury border-start-0"
                value={identificacion}
                onChange={e => setIdentificacion(e.target.value)}
                placeholder="Número de cédula"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="label-text">CÓDIGO DE ACCESO</label>
            <div className="input-group">
              <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: 'var(--glass-border)' }}>
                <FiLock className="text-warning" />
              </span>
              <input
                type="password"
                className="form-control form-control-luxury border-start-0"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="alert alert-danger glass-panel border-danger text-danger py-2 px-3 mb-4 text-center small fw-bold">
              {error}
            </div>
          )}

          <button className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2" disabled={loading}>
            {loading ? "VERIFICANDO..." : isRegister ? "ENVIAR SOLICITUD" : "AUTENTICAR ACCESO"}
            <FiArrowRight />
          </button>
        </form>

        <div className="text-center mt-5">
          <button
            className="btn btn-link text-warning text-decoration-none small fw-bold"
            onClick={() => setIsRegister(!isRegister)}
            style={{ letterSpacing: '1px' }}
          >
            {isRegister ? "VOLVER AL ACCESO PRIVADO" : "ABRIR CUENTA PRESTIGE"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  pageBg: {
    background: 'radial-gradient(circle at center, #1a1a1a 0%, #000 100%)',
    position: 'relative',
    overflow: 'hidden'
  },
  loginCard: {
    width: '100%',
    maxWidth: '500px',
    border: '1px solid rgba(212, 175, 55, 0.3) !important',
  }
};