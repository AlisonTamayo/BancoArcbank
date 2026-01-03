import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { loginExitoso, crearCuentaWeb } from "../services/bancaApi";
import { useNavigate } from "react-router-dom";

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
        setError("REGISTRO EXITOSO. PROCEDA A IDENTIFICARSE.");
      } else {
        const user = await loginExitoso(identificacion, password);
        authLogin(user);
        navigate("/");
      }
    } catch (err) {
      setError(err.message || "FALLO EN LA AUTENTICACIÓN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.overlay}></div>
      <div className="premium-card fade-in" style={styles.loginCard}>
        <div style={styles.brandBox}>
          <div style={styles.logo}>A</div>
          <h1 style={styles.brandName}>ARCBANK</h1>
          <p style={styles.tagline}>PRIVATE & PRESTIGE BANKING</p>
        </div>

        <h2 style={styles.title}>{isRegister ? "SOLICITUD DE MEMBRESÍA" : "ACCESO PRIVADO"}</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          {isRegister && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>IDENTIDAD COMPLETA</label>
              <input
                className="modern-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="EJ. JULIO CÉSAR"
              />
            </div>
          )}
          <div style={styles.inputGroup}>
            <label style={styles.label}>NÚMERO DE IDENTIFICACIÓN</label>
            <input
              className="modern-input"
              value={identificacion}
              onChange={e => setIdentificacion(e.target.value)}
              placeholder="DNI / CÉDULA"
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>CLAVE SECRETA</label>
            <input
              type="password"
              className="modern-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button className="modern-btn" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
            {loading ? "VERIFICANDO..." : isRegister ? "ENVIAR SOLICITUD" : "INGRESAR AL SISTEMA"}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
            {isRegister ? "¿YA DISPONE DE ACCESO?" : "¿NO ES MIEMBRO TODAVÍA?"}{" "}
            <span onClick={() => setIsRegister(!isRegister)} style={styles.toggle}>
              {isRegister ? "CONECTARSE" : "SOLICITAR ACCESO"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "url('https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=2047&auto=format&fit=crop') center/cover",
    position: "relative",
  },
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "radial-gradient(circle, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.95) 100%)",
  },
  loginCard: {
    width: "450px",
    padding: "60px 50px",
    zIndex: 10,
    textAlign: "center",
  },
  brandBox: {
    marginBottom: "50px",
  },
  logo: {
    width: "60px",
    height: "60px",
    background: "var(--gold-primary)",
    color: "#000",
    fontSize: "32px",
    fontWeight: "900",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 15px",
    borderRadius: "2px",
    boxShadow: "0 0 30px rgba(212, 175, 55, 0.4)",
  },
  brandName: {
    fontSize: "28px",
    letterSpacing: "6px",
    fontWeight: "900",
  },
  tagline: {
    fontSize: "10px",
    letterSpacing: "4px",
    color: "var(--gold-primary)",
    marginTop: "5px",
    fontWeight: "700",
  },
  title: {
    fontSize: "14px",
    letterSpacing: "3px",
    marginBottom: "40px",
    color: "var(--text-dim)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    textAlign: "left",
  },
  label: {
    fontSize: "10px",
    letterSpacing: "1px",
    color: "var(--gold-primary)",
    marginBottom: "8px",
    display: "block",
    fontWeight: "700",
  },
  error: {
    color: "var(--error-glow)",
    fontSize: "11px",
    textAlign: "center",
    fontWeight: "800",
    padding: "10px",
    border: "1px solid var(--error-glow)",
  },
  footer: {
    marginTop: "40px",
  },
  toggle: {
    color: "var(--gold-primary)",
    cursor: "pointer",
    fontWeight: "900",
    marginLeft: "5px",
    textDecoration: "underline",
  }
};