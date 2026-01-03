import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
// Importamos apiFetch directamente si AuthContext lo expone, o usamos fetch
import { FaUser, FaLock, FaEyeSlash, FaEye } from "react-icons/fa";
import "./Login.css";

// Definimos apiFetch local si no viene del context para evitar errores
const GATEWAY = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

export default function Login() {
  const { login, persistIdentification } = useAuth();
  const navigate = useNavigate();

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Estados de Registro
  const [showRegister, setShowRegister] = useState(false)
  const [regUser, setRegUser] = useState("")
  const [regPass, setRegPass] = useState("")
  const [regTipoId, setRegTipoId] = useState("CEDULA")
  const [regId, setRegId] = useState("")
  const [regSucursal, setRegSucursal] = useState(1)
  const [regMsg, setRegMsg] = useState("")

  const submit = async (e) => {
    e.preventDefault()
    setErr('')

    // Login normal
    const res = await login(user, pass)

    if (!res.ok) {
      setErr(res.error || "Credenciales incorrectas");
      return;
    }

    // Login exitoso
    setTimeout(() => navigate('/'), 100)
  }

  const submitRegister = async (e) => {
    e.preventDefault()
    setRegMsg('')

    try {
      const body = {
        nombreUsuario: regUser,
        clave: regPass,
        tipoIdentificacion: regTipoId,
        identificacion: regId,
        idSucursal: Number(regSucursal)
      }

      // Ajuste: Llamada al endpoint de registro. 
      // Si este endpoint está en el Gateway bajo /api/auth/registro o similar, ajústalo.
      // Asumiremos que AuthContext expone apiFetch o usamos fetch directo al gateway
      const resp = await fetch(`${GATEWAY}/api/usuarios/registro`, { // Ajusta la ruta según tu backend de seguridad
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!resp.ok) throw new Error("Error en registro");

      const data = await resp.json();

      setRegMsg('Registro exitoso')
      setShowRegister(false)
      setUser(regUser)
      // Auto-llenar la identificación en el contexto si es posible
      try { persistIdentification(regId, data.idUsuario) } catch (e) { }

    } catch (e) {
      setRegMsg(e.message || 'Error en registro')
    }
  }


  return (
    <div className="login-container" style={styles.container}>
      <div style={styles.loginSplit}>
        <div style={styles.formArea}>
          <div style={styles.logoContainer}>
            <span style={styles.diamond}>◆</span>
            <span style={styles.brandText}>ARCBANK</span>
          </div>

          <div style={styles.welcomeText}>
            <h1 style={styles.title}>Banca Digital</h1>
            <p style={styles.subtitle}>Accede a tu plataforma financiera de forma segura</p>
          </div>

          {err && <div className="premium-card" style={styles.errorCard}>{err}</div>}
          {regMsg && <div className="premium-card" style={{ ...styles.errorCard, background: '#ecfdf5', color: '#059669', borderColor: '#10b981' }}>{regMsg}</div>}

          <form onSubmit={submit} style={styles.form}>
            {!showRegister ? (
              <>
                <div style={styles.inputWrapper}>
                  <label style={styles.label}>Usuario</label>
                  <div style={styles.iconInput}>
                    <FaUser style={styles.fieldIcon} />
                    <input
                      className="modern-input"
                      style={{ paddingLeft: '44px' }}
                      placeholder="Ingrese su usuario"
                      value={user}
                      onChange={(e) => setUser(e.target.value)}
                    />
                  </div>
                </div>

                <div style={styles.inputWrapper}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label style={styles.label}>Contraseña</label>
                    <span style={styles.forgotPass}>¿Olvidó su contraseña?</span>
                  </div>
                  <div style={styles.iconInput}>
                    <FaLock style={styles.fieldIcon} />
                    <input
                      className="modern-input"
                      style={{ paddingLeft: '44px' }}
                      type={showPass ? "text" : "password"}
                      placeholder="••••••••"
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                    />
                    <div style={styles.eyeBtn} onClick={() => setShowPass(!showPass)}>
                      {showPass ? <FaEyeSlash /> : <FaEye />}
                    </div>
                  </div>
                </div>

                <button type="submit" className="modern-btn modern-btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                  Iniciar Sesión
                </button>
              </>
            ) : (
              <div style={styles.registerScroll}>
                <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Registro de Nuevo Cliente</h3>
                <input className="modern-input" placeholder="Nombre de Usuario" value={regUser} onChange={e => setRegUser(e.target.value)} style={{ marginBottom: '12px' }} />
                <input className="modern-input" type="password" placeholder="Contraseña Segura" value={regPass} onChange={e => setRegPass(e.target.value)} style={{ marginBottom: '12px' }} />
                <select className="modern-input" value={regTipoId} onChange={e => setRegTipoId(e.target.value)} style={{ marginBottom: '12px' }}>
                  <option value="CEDULA">Cédula de Identidad</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
                <input className="modern-input" placeholder="Número de Documento" value={regId} onChange={e => setRegId(e.target.value)} style={{ marginBottom: '12px' }} />
                <input className="modern-input" type="number" placeholder="ID Sucursal" value={regSucursal} onChange={e => setRegSucursal(e.target.value)} style={{ marginBottom: '20px' }} />

                <button type="button" className="modern-btn modern-btn-primary" style={{ width: '100%' }} onClick={submitRegister}>
                  Completar Registro
                </button>
              </div>
            )}

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                {showRegister ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta aún?'}
                <button
                  type="button"
                  onClick={() => setShowRegister(!showRegister)}
                  style={styles.textBtn}
                >
                  {showRegister ? ' Inicia sesión aquí' : ' Regístrate ahora'}
                </button>
              </p>
            </div>
          </form>

          <div style={styles.footer}>
            © 2026 ARCBANK | Protocolo de Seguridad Bancaria Activo
          </div>
        </div>

        <div style={styles.visualArea}>
          <div style={styles.visualOverlay}></div>
          <div style={styles.quoteCard}>
            <div style={styles.quoteIcon}>"</div>
            <p style={styles.quoteText}>La excelencia en banca digital no es una opción, es nuestro estándar de seguridad para tu patrimonio.</p>
            <div style={styles.quoteAuthor}>— Dirección Ejecutiva Arcbank</div>
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
    background: "#f0f2f5",
    fontFamily: "'Inter', sans-serif",
  },
  loginSplit: {
    display: "flex",
    width: "100%",
    maxWidth: "1100px",
    height: "720px",
    background: "#fff",
    borderRadius: "24px",
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
    margin: "20px",
  },
  formArea: {
    flex: "1",
    padding: "60px",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  visualArea: {
    flex: "1.1",
    background: "url('https://images.unsplash.com/photo-1554469384-e58fac16e23a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    position: "relative",
    display: "flex",
    alignItems: "flex-end",
    padding: "40px",
  },
  visualOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "linear-gradient(to bottom, rgba(26,28,30,0.1) 0%, rgba(26,28,30,0.8) 100%)",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "50px",
  },
  diamond: {
    width: "28px",
    height: "28px",
    background: "var(--primary-gradient)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    borderRadius: "6px",
    fontSize: "18px",
  },
  brandText: {
    fontSize: "22px",
    fontWeight: "800",
    color: "var(--primary)",
    letterSpacing: "2px",
  },
  welcomeText: {
    marginBottom: "32px",
  },
  title: {
    fontSize: "32px",
    fontWeight: "800",
    color: "var(--secondary)",
    fontFamily: "'Outfit', sans-serif",
  },
  subtitle: {
    fontSize: "16px",
    color: "var(--text-muted)",
    marginTop: "8px",
  },
  form: {
    flex: 1,
  },
  inputWrapper: {
    marginBottom: "20px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "var(--secondary)",
    marginBottom: "8px",
    display: "block",
  },
  iconInput: {
    position: "relative",
  },
  fieldIcon: {
    position: "absolute",
    left: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#94a3b8",
  },
  eyeBtn: {
    position: "absolute",
    right: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    cursor: "pointer",
    color: "#94a3b8",
  },
  forgotPass: {
    fontSize: "13px",
    color: "var(--primary)",
    fontWeight: "600",
    cursor: "pointer",
  },
  textBtn: {
    background: "none",
    border: "none",
    color: "var(--primary)",
    fontWeight: "700",
    cursor: "pointer",
    fontSize: "14px",
  },
  errorCard: {
    padding: "12px 16px",
    background: "#fef2f2",
    border: "1px solid #fee2e2",
    color: "#b91c1c",
    fontSize: "14px",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  footer: {
    marginTop: "40px",
    fontSize: "12px",
    color: "#94a3b8",
    textAlign: "center",
  },
  quoteCard: {
    position: "relative",
    zIndex: 2,
    background: "rgba(255,255,255,0.1)",
    backdropFilter: "blur(10px)",
    padding: "32px",
    borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "#fff",
    maxWidth: "400px",
  },
  quoteIcon: {
    fontSize: "60px",
    lineHeight: "20px",
    color: "var(--accent)",
    fontFamily: "serif",
    marginBottom: "10px",
  },
  quoteText: {
    fontSize: "18px",
    fontWeight: "500",
    lineHeight: "1.6",
    marginBottom: "20px",
  },
  quoteAuthor: {
    fontSize: "14px",
    color: "var(--accent)",
    fontWeight: "700",
  }
};