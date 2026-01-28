import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import { cuentas } from '../../services/api';
import './BuscarCuentaDevolucion.css';

export default function BuscarCuentaDevolucion() {
    const navigate = useNavigate();
    const [termino, setTermino] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const cajero = JSON.parse(localStorage.getItem('cajero')) || { nombreCompleto: 'Cajero' };

    const handleBuscar = async (e) => {
        e.preventDefault();
        if (!termino) return;

        setLoading(true);
        setError('');

        try {
            // Reutilizamos la lógica híbrida de getCuenta (busca por cuenta o cédula)
            const resultado = await cuentas.getCuenta(termino);

            if (resultado) {
                // Guardamos la cuenta encontrada en el contexto/state para la siguiente pantalla
                localStorage.setItem('cuentaDevolucion', JSON.stringify({
                    id: resultado.idCuenta,
                    numero: resultado.numeroCuenta,
                    titular: resultado.nombreTitular,
                    saldo: resultado.saldo
                }));
                navigate('/devoluciones/lista');
            } else {
                setError('No se encontraron resultados.');
            }
        } catch (err) {
            console.error(err);
            setError('Error al buscar cliente o cuenta.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sel-container">
            <Sidebar cajero={cajero} />
            <main className="sel-main">
                <div className="sel-header-box">
                    <div className="sel-header-content">
                        <div className="sel-header-icon"><i className="fa-solid fa-rotate-left"></i></div>
                        <div className="sel-header-text"><p className="sel-user-name">Módulo de Devoluciones</p></div>
                    </div>
                </div>

                <div className="buscar-container">
                    <h2>Buscar Cliente para Devolución</h2>
                    <form onSubmit={handleBuscar} className="buscar-form">
                        <input
                            type="text"
                            placeholder="Ingrese número de cuenta o cédula"
                            className="buscar-input"
                            value={termino}
                            onChange={e => setTermino(e.target.value)}
                        />
                        <button type="submit" className="sel-btn" disabled={loading}>
                            {loading ? 'Buscando...' : 'Buscar Movimientos'}
                        </button>
                    </form>
                    {error && <p className="error-msg">{error}</p>}
                </div>
            </main>
        </div>
    );
}
