import "./Sidebar.css";
import React from "react";
import logo from "../../assets/Logo.png";
import { useNavigate } from "react-router-dom";

export default function Sidebar({ cajero }) {
  const nav = useNavigate();

  const nombreCompleto = cajero?.nombreCompleto || "Cajero";
  const primerNombre = nombreCompleto.split(" ")[0];

  const cerrarSesion = () => {
    localStorage.removeItem("cajero");
    nav("/");
  };

  const irInicio = () => {
    nav("/seleccionar");
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h2 style={{ color: '#d4af37', textAlign: 'center', margin: 0 }}>ARCBANK</h2>
      </div>

      <div className="sidebar-user">
        <div className="sidebar-user-icon">
          <i className="fa-solid fa-user"></i>
        </div>

        <span className="sidebar-user-name">{primerNombre}</span>
      </div>

      <div className="sidebar-options">
        {/* Agregado onClick para navegar */}
        <button className="sidebar-item" onClick={irInicio}>
          <i className="fa-solid fa-house"></i>
          Inicio
        </button>
      </div>

      <button className="sidebar-logout" onClick={cerrarSesion}>
        <i className="fa-solid fa-right-from-bracket"></i>
        Cerrar sesión
      </button>
    </div>
  );
}
