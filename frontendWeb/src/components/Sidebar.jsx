import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FiHome, FiList, FiLogOut, FiUser, FiRepeat, FiGlobe } from "react-icons/fi";

export default function Sidebar({ isOpen, onRequestClose }) {
  const { state, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { path: "/", icon: <FiHome />, label: "Dashboard", end: true },
    { path: "/movimientos", icon: <FiList />, label: "Operaciones" },
    { path: "/transferir", icon: <FiRepeat />, label: "Transferir" },
    { path: "/interbancarias", icon: <FiGlobe />, label: "Red Externa" },
    { path: "/perfil", icon: <FiUser />, label: "Mi Perfil" },
  ];

  return (
    <aside className="glass-panel d-flex flex-column" style={styles.sidebar}>
      <div className="p-4 text-center border-bottom" style={{ borderColor: 'var(--glass-border) !important' }}>
        <h1 className="gold-text m-0" style={{ fontSize: '24px', letterSpacing: '4px' }}>ARCBANK</h1>
        <small className="text-muted" style={{ fontSize: '10px', letterSpacing: '2px' }}>EST. 2025</small>
      </div>

      <div className="p-4">
        <div className="d-flex align-items-center p-3 glass-card" style={{ background: 'rgba(212, 175, 55, 0.05)' }}>
          <div className="rounded-circle d-flex align-items-center justify-content-center" style={styles.avatar}>
            {state?.user?.name ? state.user.name[0] : "A"}
          </div>
          <div className="ms-3 overflow-hidden">
            <div className="fw-bold text-white text-truncate" style={{ fontSize: '0.9rem' }}>{state?.user?.name || "Cliente"}</div>
            <div className="text-warning" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>PREMIUM MEMBER</div>
          </div>
        </div>
      </div>

      <nav className="flex-grow-1 px-3 mt-2">
        <ul className="nav nav-pills flex-column gap-2">
          {navItems.map((item) => (
            <li className="nav-item" key={item.path}>
              <NavLink
                to={item.path}
                end={item.end}
                className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-4 py-3 ${isActive ? 'active-luxury' : 'text-white-50'}`}
                style={styles.link}
              >
                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                <span className="fw-semibold" style={{ fontSize: '0.9rem', letterSpacing: '0.5px' }}>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 mt-auto border-top" style={{ borderColor: 'var(--glass-border) !important' }}>
        <button className="btn btn-link text-danger text-decoration-none d-flex align-items-center gap-2 p-0 fw-bold" onClick={handleLogout} style={{ fontSize: '0.9rem' }}>
          <FiLogOut /> SALIR DEL SISTEMA
        </button>
      </div>

      {/* Estilos específicos para el sidebar */}
      <style>{`
        .active-luxury {
          background: var(--gold-primary) !important;
          color: #000 !important;
          box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
          border-radius: 12px !important;
        }
        .nav-link:hover:not(.active-luxury) {
          background: rgba(255, 255, 255, 0.05);
          color: #fff !important;
          border-radius: 12px;
        }
      `}</style>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 'var(--sidebar-width)',
    height: '100vh',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 1000,
    borderRadius: '0 25px 25px 0 !important',
  },
  avatar: {
    width: '40px',
    height: '40px',
    background: 'var(--gold-gradient)',
    color: '#000',
    fontWeight: '800',
    fontSize: '20px',
  },
  link: {
    transition: 'all 0.3s ease',
  }
};