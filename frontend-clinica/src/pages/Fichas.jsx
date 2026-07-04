import { useEffect, useState } from 'react';
import api from '../api/axiosConfig';

export default function Fichas() {
    const [fichas, setFichas] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Hacemos el llamado a la API
        api.get('/fichas')
            .then(response => {
                // Si la respuesta es un array, guardamos, si no, guardamos array vacío
                setFichas(Array.isArray(response.data) ? response.data : []);
            })
            .catch(err => {
                console.error("Detalle del error:", err);
                setError("No se pudieron cargar las fichas (Error de conexión o permisos).");
            });
    }, []);

    return (
        <div className="section-container">
            <h2> Fichas Clínicas</h2>
            
            {error && <div className="card" style={{ color: 'red' }}>{error}</div>}

            {!error && fichas.length === 0 && (
                <div className="card">
                    <p>No hay fichas registradas actualmente.</p>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', width: '100%', maxWidth: '900px' }}>
                {fichas.map((ficha) => (
                    <div key={ficha.id || Math.random()} className="card">
                        <h3>Ficha: {ficha.id}</h3>
                        <p>Paciente: {ficha.paciente_nombre || "Paciente sin nombre"}</p>
                        <button>Ver Historial</button>
                    </div>
                ))}
            </div>
        </div>
    );
}