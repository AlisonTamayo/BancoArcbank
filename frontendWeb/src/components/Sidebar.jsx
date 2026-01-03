import React, { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FiHome, FiList, FiLogOut, FiUser, FiArrowLeftRight, FiMenu, FiX } from "react-icons/fi";
import { TbArrowsExchange } from "react-icons/tb";

export default function Sidebar({ isOpen = true, onRequestClose }) {
  const { state, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isDevView = location.pathname && location.pathname.includes("-dev");
  const interbancariasPath = isDevView ? "/interbancarias-dev" : "/interbancarias";
  const transferirPath = isDevView ? "/transferir-dev" : "/transferir";

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { path: "/", icon: <FiHome />, label: "Dashboard", end: true },
    { path: "/movimientos", icon: <FiList />, label: "Movimientos" },
    { path: transferirPath, icon: <FiArrowLeftRight />, label: "Transferir" },
    { path: interbancariasPath, icon: <TbArrowsExchange />, label: "Otros Bancos" },
    { path: "/perfil", icon: <FiUser />, label: "Mi Perfil" },
  ];

  return (
    <>
      <aside
        className={`sidebar ${isOpen ? 'open' : 'closed'}`}
        style={styles.sidebar(isOpen, isMobile)}
      >
        <div style={styles.brandContainer}>
          <div style={styles.logoIcon}>A</div>
          <span style={styles.brandTitle} className="brand-text">ARCBANK</span>
        </div>

        <div style={styles.userCard}>
          <div style={styles.avatar}>
            {state?.user?.name ? state.user.name[0].toUpperCase() : "U"}
          </div>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{state?.user?.name || "Premium User"}</div>
            <div style={styles.userRole}>Private Banking</div>
          </div>
        </div>

        <nav style={styles.nav}>
          <ul style={styles.navList}>
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.end}
                  style={({ isActive }) => styles.navLink(isActive)}
                  onClick={isMobile ? onRequestClose : undefined}
                >
                  <span style={styles.navIcon}>{item.icon}</span>
                  <span style={styles.navLabel}>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div style={styles.footer}>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            <FiLogOut size={18} /> <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {isMobile && isOpen && (
        <div style={styles.mobileOverlay} onClick={onRequestClose} />
      )}
    </>
  );
}

const styles = {
  sidebar: (isOpen, isMobile) => ({
    width: "var(--sidebar-width)",
    background: "var(--secondary)",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    padding: "40px 24px",
    position: isMobile ? "fixed" : "sticky",
    top: 0,
    left: isMobile && !isOpen ? "-100%" : 0,
    zIndex: 1100,
    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "10px 0 30px rgba(0,0,0,0.2)",
    color: "#fff",
  }),
  brandContainer: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "48px",
    paddingLeft: "8px",
  },
  logoIcon: {
    width: "32px",
    height: "32px",
    background: "var(--primary-gradient)",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    color: "#fff",
    fontSize: "18px",
  },
  brandTitle: {
    fontSize: "24px",
    letterSpacing: "3px",
    color: "var(--accent)",
  },
  userCard: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "20px",
    background: "var(--secondary-light)",
    borderRadius: "16px",
    marginBottom: "40px",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  avatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: "var(--primary-gradient)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "20px",
    color: "#fff",
    border: "2px solid rgba(255,255,255,0.1)",
  },
  userInfo: {
    display: "flex",
    flexDirection: "column",
  },
  userName: {
    fontSize: "15px",
    fontWeight: "600",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "140px",
  },
  userRole: {
    fontSize: "11px",
    color: "var(--primary-light)",
    textTransform: "uppercase",
    letterSpacing: "1px",
    marginTop: "2px",
  },
  nav: {
    flex: 1,
  },
  navList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  navLink: (isActive) => ({
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 20px",
    borderRadius: "14px",
    color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
    textDecoration: "none",
    fontSize: "15px",
    fontWeight: isActive ? "600" : "500",
    background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
    transition: "all 0.2s ease",
    borderLeft: isActive ? "4px solid var(--primary)" : "4px solid transparent",
  }),
  navIcon: {
    fontSize: "20px",
    display: "flex",
  },
  navLabel: {},
  footer: {
    marginTop: "auto",
    paddingTop: "30px",
    borderTop: "1px solid rgba(255,255,255,0.05)",
  },
  logoutBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px 20px",
    borderRadius: "14px",
    background: "transparent",
    border: "none",
    color: "#ff6b6b",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  mobileOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 1050,
  }
};