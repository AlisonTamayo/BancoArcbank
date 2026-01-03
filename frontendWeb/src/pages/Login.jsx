import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { loginExitoso, crearCuentaWeb } from "../services/bancaApi";
import { useNavigate } from "react-router-dom";
import { FiUser, FiLock, FiEye, FiEyeOff, FiCreditCard } from "react-icons/fi";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [identificacion, setIdentificacion] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [tipoIdentificacion, setTipoIdentificacion] = useState("CEDULA");

  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        if (!name || !identificacion || !password) throw new Error("Todos los campos son requeridos");
        const resp = await crearCuentaWeb({ identificacion, password, name, tipoIdentificacion });
        if (resp) {
          setIsRegister(false);
          setError("Cuenta creada con éxito. Por favor, inicie sesión.");
        }
      } else {
        const user = await loginExitoso(identificacion, password);
        authLogin(user);
        navigate("/");
      }
    } catch (err) {
      setError(err.message || "Error en la operación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginCard} className="fade-in">
        <div style={styles.leftPane}>
          <div style={styles.brandBox}>
            <div style={styles.logoIcon}>A</div>
            <h1 className="brand-text" style={styles.brandTitle}>ARCBANK</h1>
          </div>

          <div style={styles.contentHeader}>
            <h2 style={styles.formTitle}>{isRegister ? "Join the Circle" : "Welcome Back"}</h2>
            <p style={styles.formSubtitle}>
              {isRegister ? "Start your journey with premium banking services." : "Experience elite financial management at your fingertips."}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            {isRegister && (
              <div style={styles.inputGroup}>
                <label className="label-text">Nombre Completo</label>
                <div style={styles.inputWrapper}>
                  <FiUser style={styles.inputIcon} />
                  <input
                    className="modern-input"
                    placeholder="Ej: Alejandro Magno"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div style={styles.row}>
              <div style={{ flex: 1, ...styles.inputGroup }}>
                <label className="label-text">DNI / Identificación</label>
                <div style={styles.inputWrapper}>
                  <FiCreditCard style={styles.inputIcon} />
                  <input
                    className="modern-input"
                    placeholder="Número de identificación"
                    value={identificacion}
                    onChange={(e) => setIdentificacion(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label className="label-text">Contraseña Segura</label>
              <div style={styles.inputWrapper}>
                <FiLock style={styles.inputIcon} />
                <input
                  type={showPass ? "text" : "password"}
                  className="modern-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div onClick={() => setShowPass(!showPass)} style={styles.eyeIcon}>
                  {showPass ? <FiEyeOff /> : <FiEye />}
                </div>
              </div>
            </div>

            {error && <div style={styles.errorMsg}>{error}</div>}

            <button className="modern-btn modern-btn-primary" style={{ width: "100%", marginTop: "10px" }} disabled={loading}>
              {loading ? "Procesando..." : isRegister ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div style={styles.toggleText}>
            {isRegister ? "¿Ya eres cliente premium?" : "¿Nuevo en Arcbank?"}{" "}
            <span onClick={() => setIsRegister(!isRegister)} style={styles.toggleBtn}>
              {isRegister ? "Iniciar Sesión" : "Abrir Cuenta"}
            </span>
          </div>
        </div>

        <div style={styles.rightPane}>
          <div style={styles.overlay}></div>
          <div style={styles.quoteCard} className="glass">
            <h3 style={{ fontSize: '24px', marginBottom: '16px' }}>"La excelencia financiera no es un acto, sino un hábito."</h3>
            <p style={{ fontSize: '14px', color: 'var(--primary-light)', fontWeight: '700' }}>— ARCBANK STRATEGY</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg)",
    padding: "20px",
  },
  loginCard: {
    display: "flex",
    width: "1000px",
    maxWidth: "100%",
    minHeight: "650px",
    background: "#fff",
    borderRadius: "24px",
    overflow: "hidden",
    boxShadow: "0 30px 60px rgba(0,0,0,0.12)",
  },
  leftPane: {
    flex: 1.2,
    padding: "60px",
    display: "flex",
    flexDirection: "column",
  },
  rightPane: {
    flex: 1,
    background: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop') center/cover",
    position: "relative",
    display: "flex",
    alignItems: "flex-end",
    padding: "40px",
  },
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "linear-gradient(to bottom, transparent 0%, var(--secondary) 100%)",
    opacity: 0.8,
  },
  quoteCard: {
    position: "relative",
    zIndex: 2,
    padding: "32px",
    borderRadius: "16px",
    color: "#fff",
  },
  brandBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "48px",
  },
  logoIcon: {
    width: "40px",
    height: "40px",
    background: "var(--primary-gradient)",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: "900",
    fontSize: "20px",
  },
  brandTitle: {
    fontSize: "26px",
    letterSpacing: "4px",
    color: "var(--primary)",
  },
  contentHeader: {
    marginBottom: "40px",
  },
  formTitle: {
    fontSize: "32px",
    marginBottom: "12px",
    fontWeight: '800',
  },
  formSubtitle: {
    color: "var(--text-muted)",
    fontSize: "15px",
    maxWidth: "340px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
  },
  inputWrapper: {
    position: "relative",
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--text-muted)",
    fontSize: "18px",
  },
  modernInput: {
    // Ya definido en index.css como .modern-input
  },
  eyeIcon: {
    position: "absolute",
    right: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    cursor: "pointer",
    color: "var(--text-muted)",
  },
  errorMsg: {
    padding: "12px",
    background: "rgba(220, 38, 38, 0.05)",
    color: "var(--error)",
    borderRadius: "8px",
    fontSize: "13px",
    textAlign: "center",
    border: "1px solid rgba(220, 38, 38, 0.1)",
  },
  toggleText: {
    marginTop: "auto",
    textAlign: "center",
    fontSize: "14px",
    color: "var(--text-muted)",
  },
  toggleBtn: {
    color: "var(--primary)",
    fontWeight: "700",
    cursor: "pointer",
    marginLeft: "6px",
  },
};