import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import api from '../api/axiosConfig';

// Conectamos al servidor de tickets (que corre en el puerto 3000 según tu compose)
// Nota: En producción, usa la URL de tu API Gateway
const socket = io('http://localhost:3000'); 

export default function Tickets() {
    const [ticketActual, setTicketActual] = useState(null);
    const [historial, setHistorial] = useState([]);

    useEffect(() => {
        // 1. Cargar estado inicial desde la API (Cache HIT/MISS)
        api.get('/tickets')
            .then(res => {
                const tickets = res.data;
                const llamado = tickets.find(t => t.estado === 'LLAMADO');
                setTicketActual(llamado);
                setHistorial(tickets.filter(t => t.estado === 'ATENDIDO').slice(0, 5));
            });

        // 2. Escuchar llamados en tiempo real vía WebSockets
        socket.on('nuevo_llamado', (ticket) => {
            setTicketActual(ticket);
            // Agregamos al historial (opcional)
            setHistorial(prev => [ticket, ...prev].slice(0, 5));
        });

        return () => socket.off('nuevo_llamado');
    }, []);

    return (
        <div className="section-container">
            <h2> Sala de Espera - Llamado Pacientes</h2>
            
            <div className="card" style={{ fontSize: '2rem', color: '#007bff', textAlign: 'center' }}>
                {ticketActual ? (
                    <div>
                        <strong>Llamando a:</strong><br />
                        {ticketActual.numero_atencion}
                    </div>
                ) : (
                    <p>Esperando llamados...</p>
                )}
            </div>

            <div className="card">
                <h3>Últimos llamados</h3>
                <table style={{ width: '100%' }}>
                    <thead>
                        <tr>
                            <th>Ticket</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {historial.map(t => (
                            <tr key={t.id}>
                                <td>{t.numero_atencion}</td>
                                <td>{t.estado}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}