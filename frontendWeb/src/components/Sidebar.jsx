import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FiHome, FiActivity, FiArrowRight, FiLogOut, FiUser, FiZap } from "react-icons/fi";

export default function Sidebar({ isOpen, onRequestClose }) {
  const { state, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems = [
    { path: "/", icon: <FiHome />, label: "PANEL ELITE", end: true },
    { path: "/movimientos", icon: <FiActivity />, label: "ACTIVIDAD" },
    { path: "/transferir", icon: <FiZap />, label: "TRANSFERIR" },
    { path: "/interbancarias", icon: <FiArrowRight />, label: "RED EXTERNA" },
    { path: "/perfil", icon: <FiUser />, label: "PORTAFOLIO" },
  ];

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brandArea}>
        <div style={styles.brandLogo}>A</div>
        <h1 style={styles.brandText}>ARCBANK</h1>
        <div style={styles.brandSub}>EST. 2025</div>
      </div>

      <div style={styles.userCard}>
        <div style={styles.avatar}>
          {state?.user?.name ? state.user.name[0] : "A"}
        </div>
        <div style={styles.userMeta}>
          <div style={styles.userName}>{state?.user?.name || "Premium Member"}</div>
          <div style={styles.accStatus}>PRIVATE BANKING</div>
        </div>
      </div>

      <nav style={styles.nav}>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            style={({ isActive }) => styles.navLink(isActive)}
          >
            <span style={styles.icon}>{item.icon}</span>
            <span style={styles.label}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={styles.footer}>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          <FiLogOut /> <span>FINALIZAR SESIÓN</span>
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: "var(--sidebar-w)",
    backgroundColor: "#000",
    borderRight: "1px solid rgba(212, 175, 55, 0.3)",
    display: "flex",
    flexDirection: "column",
    padding: "50px 0",
    height: "100vh",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  brandArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "60px",
  },
  brandLogo: {
    width: "45px",
    height: "45px",
    background: "linear-gradient(135deg, #BF953F, #AA771C)",
    borderRadius: "2px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: "900",
    color: "#000",
    marginBottom: "15px",
    boxShadow: "0 0 20px rgba(191, 149, 63, 0.4)",
  },
  brandText: {
    fontSize: "20px",
    fontWeight: "900",
    letterSpacing: "5px",
    color: "#fff",
  },
  brandSub: {
    fontSize: "10px",
    letterSpacing: "3px",
    color: "var(--gold-primary)",
    marginTop: "5px",
  },
  userCard: {
    padding: "0 25px",
    marginBottom: "50px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },
  avatar: {
    width: "40px",
    height: "40px",
    background: "#111",
    border: "1px solid var(--gold-primary)",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    color: "var(--gold-primary)",
  },
  userMeta: {},
  userName: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#fff",
  },
  accStatus: {
    fontSize: "9px",
    color: "var(--gold-primary)",
    letterSpacing: "1px",
    marginTop: "2px",
  },
  nav: {
    flex: 1,
    padding: "0 15px",
  },
  navLink: (active) => ({
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "16px 20px",
    textDecoration: "none",
    color: active ? "#000" : "rgba(255,255,255,0.4)",
    background: active ? "var(--gold-primary)" : "transparent",
    fontWeight: active ? "900" : "500",
    fontSize: "11px",
    letterSpacing: "2px",
    borderRadius: "2px",
    marginBottom: "10px",
    transition: "0.2s ease",
  }),
  icon: { fontSize: "16px" },
  footer: {
    padding: "0 30px",
    marginTop: "auto",
  },
  logoutBtn: {
    background: "none",
    border: "none",
    color: "#ff4d4d",
    fontSize: "10px",
    fontWeight: "800",
    letterSpacing: "2px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
  }
};