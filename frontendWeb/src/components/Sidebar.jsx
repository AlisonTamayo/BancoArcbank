import React, { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FiHome, FiList, FiLogOut } from "react-icons/fi";
import { TbArrowsExchange } from "react-icons/tb";

export default function Sidebar({ isOpen = true, onRequestClose }) {
  const { state, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isDevView = location.pathname && location.pathname.includes("-dev");

  const interbancariasPath = isDevView ? "/interbancarias-dev" : "/interbancarias";
  const transferirPath = isDevView ? "/transferir-dev" : "/transferir";

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Estilos dinámicos
  const sidebarStyle = {
    ...styles.sidebar,
    ...(isMobile && isOpen ? styles.mobileOverlay : {}),
    ...(isOpen ? {} : styles.hidden)
  };

  return (
    <aside className="sidebar" style={sidebarStyle}>
      <div className="brand" style={styles.brand}>
        <span style={styles.brandDiamond}>◆</span> ARCBANK
      </div>

      <div style={styles.userSection}>
        <div style={styles.avatar}>
          {state?.user?.name ? state.user.name[0].toUpperCase() : "U"}
        </div>
        <div style={styles.userInfo}>
          <span style={styles.userName}>{state?.user?.name || "Premium User"}</span>
          <span style={styles.userStatus}>Cliente Verificado</span>
        </div>
      </div>

      <nav style={styles.nav}>
        <ul style={styles.navList}>
          <li>
            <NavLink to="/" end style={({ isActive }) => isActive ? { ...styles.link, ...styles.activeLink } : styles.link} onClick={handleNavClick}>
              <FiHome size={20} /> <span>Inicio</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/movimientos" style={({ isActive }) => isActive ? { ...styles.link, ...styles.activeLink } : styles.link} onClick={handleNavClick}>
              <FiList size={20} /> <span>Movimientos</span>
            </NavLink>
          </li>
          <li>
            <NavLink to={transferirPath} style={({ isActive }) => isActive ? { ...styles.link, ...styles.activeLink } : styles.link} onClick={handleNavClick}>
              <TbArrowsExchange size={22} /> <span>Transferencias</span>
            </NavLink>
          </li>
          <li>
            <NavLink to={interbancariasPath} style={({ isActive }) => isActive ? { ...styles.link, ...styles.activeLink } : styles.link} onClick={handleNavClick}>
              <TbArrowsExchange size={22} /> <span>Interbancarias</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/perfil" style={({ isActive }) => isActive ? { ...styles.link, ...styles.activeLink } : styles.link} onClick={handleNavClick}>
              <span style={{ fontSize: 20 }}>👤</span> <span>Mi Perfil</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      <div style={styles.footer}>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          <FiLogOut size={18} /> <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: "var(--sidebar-width)",
    background: "var(--secondary)",
    color: "#fff",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    padding: "32px 16px",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  hidden: {
    width: "0",
    padding: "0",
    overflow: "hidden",
    transform: "translateX(-100%)",
  },
  mobileOverlay: {
    position: "fixed",
    left: 0,
    top: 0,
    height: "100%",
    transform: "translateX(0)",
  },
  brand: {
    fontSize: "26px",
    fontWeight: "800",
    color: "var(--accent)",
    letterSpacing: "2px",
    marginBottom: "48px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    paddingLeft: "12px",
  },
  brandDiamond: {
    fontSize: "20px",
    color: "#fff",
  },
  userSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "16px",
    marginBottom: "32px",
  },
  avatar: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "var(--primary-gradient)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "18px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
  },
  userInfo: {
    display: "flex",
    flexDirection: "column",
  },
  userName: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#fff",
  },
  userStatus: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  nav: {
    flex: 1,
  },
  navList: {
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  link: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "12px",
    color: "rgba(255,255,255,0.7)",
    textDecoration: "none",
    fontSize: "15px",
    fontWeight: "500",
    transition: "all 0.2s ease",
  },
  activeLink: {
    background: "var(--primary-gradient)",
    color: "#fff",
    boxShadow: "0 4px 12px rgba(184, 134, 11, 0.25)",
  },
  footer: {
    marginTop: "auto",
    paddingTop: "20px",
    borderTop: "1px solid rgba(255,255,255,0.1)",
  },
  logoutBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "12px",
    background: "transparent",
    border: "none",
    color: "#ff6b6b",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
};