import { useEffect, useState, useCallback } from 'react';
import api from '../api/axiosConfig';
import NuevoPacienteModal from '../components/NuevoPacienteModal';

// Mapeo de áreas según los datos sembrados en sistema_tickets/BD/init.sql
// (no existe un endpoint de áreas todavía, por eso se mantiene local).
const AREAS = {
    1: 'Medicina General',
    2: 'Pediatría',
    3: 'Odontología',
    4: 'Traumatología',
    5: 'Ginecología',
};

export default function Tickets() {
    const [tickets, setTickets] = useState([]);
    const [error, setError] = useState(null);
    const [pacientes, setPacientes] = useState([]);
    const [mostrarCrear, setMostrarCrear] = useState(false);
    const [nuevoArea, setNuevoArea] = useState('1');
    const [nuevoPaciente, setNuevoPaciente] = useState('');
    const [creando, setCreando] = useState(false);
    const [mensaje, setMensaje] = useState(null);
    const [llamando, setLlamando] = useState(null);
    const [finalizando, setFinalizando] = useState(null);
    const [mostrarNuevoPaciente, setMostrarNuevoPaciente] = useState(false);

    const cargarTickets = useCallback(() => {
        api.get('/tickets')
            .then(res => {
                setTickets(Array.isArray(res.data) ? res.data : []);
                setError(null);
            })
            .catch(() => setError('No se pudo conectar con el sistema de tickets.'));
    }, []);

    useEffect(() => {
        cargarTickets();
        api.get('/pacientes').then(res => setPacientes(res.data)).catch(() => setPacientes([]));

        // El backend de tickets no expone un canal de eventos en tiempo real,
        // así que sincronizamos la sala de espera por sondeo (polling).
        const intervalo = setInterval(cargarTickets, 4000);
        return () => clearInterval(intervalo);
    }, [cargarTickets]);

    const enEspera = tickets.filter(t => t.estado === 'EN_ESPERA');
    const llamado = tickets.find(t => t.estado === 'LLAMADO');
    const atendidos = tickets.filter(t => t.estado === 'ATENDIDO').slice(0, 5);

    const llamarSiguiente = async (id) => {
        setLlamando(id);
        setMensaje(null);
        try {
            await api.patch(`/tickets/${id}/llamar`);
            cargarTickets();
        } catch (err) {
            setMensaje({ tipo: 'error', texto: 'No se pudo llamar al paciente.' });
        } finally {
            setLlamando(null);
        }
    };

    // Marca al paciente actualmente llamado como ATENDIDO: deja de "llamarse"
    // y queda registrado como atendido (equivalente a un alta de la atención).
    const finalizarAtencion = async (id) => {
        setFinalizando(id);
        setMensaje(null);
        try {
            await api.patch(`/tickets/${id}/atender`);
            cargarTickets();
        } catch (err) {
            setMensaje({ tipo: 'error', texto: 'No se pudo finalizar la atención.' });
        } finally {
            setFinalizando(null);
        }
    };

    const crearTicket = async (e) => {
        e.preventDefault();
        if (!nuevoPaciente) return;
        setCreando(true);
        setMensaje(null);
        try {
            const prefijo = (AREAS[nuevoArea] || 'GEN').slice(0, 3).toUpperCase();
            const numero = `${prefijo}-${String(tickets.length + 1).padStart(3, '0')}`;
            await api.post('/tickets', {
                paciente_id: nuevoPaciente,
                area_id: Number(nuevoArea),
                numero_atencion: numero,
            });
            setMensaje({ tipo: 'exito', texto: `Ticket ${numero} generado.` });
            setMostrarCrear(false);
            setNuevoPaciente('');
            cargarTickets();
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'No se pudo generar el ticket.' });
        } finally {
            setCreando(false);
        }
    };

    return (
        <div className="section-container">
            <div className="section-header">
                <h2>Sala de Espera - Llamado de Pacientes</h2>
                <button onClick={() => setMostrarCrear(true)}>+ Generar Ticket</button>
            </div>

            {error && <div className="card alert-error">{error}</div>}
            {mensaje && (
                <div className={`alert ${mensaje.tipo === 'exito' ? 'alert-success' : 'alert-error'}`}>
                    {mensaje.texto}
                </div>
            )}

            <div className="card llamado-card">
                {llamado ? (
                    <div>
                        <span className="llamado-label">Llamando a</span>
                        <div className="llamado-numero">{llamado.numero_atencion}</div>
                        <span className="muted">{AREAS[llamado.area_id] || `Área ${llamado.area_id}`}</span>
                        <div className="llamado-actions">
                            <button
                                className="btn-ghost"
                                disabled={finalizando === llamado.id}
                                onClick={() => finalizarAtencion(llamado.id)}
                            >
                                {finalizando === llamado.id ? 'Finalizando...' : 'Dar de alta / Finalizar atención'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <p>Esperando llamados...</p>
                )}
            </div>

            <div className="card">
                <h3>En espera ({enEspera.length})</h3>
                <table>
                    <thead>
                        <tr><th>Ticket</th><th>Área</th><th>Acción</th></tr>
                    </thead>
                    <tbody>
                        {enEspera.map(t => (
                            <tr key={t.id}>
                                <td>{t.numero_atencion}</td>
                                <td>{AREAS[t.area_id] || t.area_id}</td>
                                <td>
                                    <button
                                        className="btn-small"
                                        disabled={llamando === t.id}
                                        onClick={() => llamarSiguiente(t.id)}
                                    >
                                        {llamando === t.id ? 'Llamando...' : 'Llamar'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {enEspera.length === 0 && <tr><td colSpan="3">No hay pacientes en espera.</td></tr>}
                    </tbody>
                </table>
            </div>

            <div className="card">
                <h3>Últimos atendidos</h3>
                <table>
                    <thead><tr><th>Ticket</th><th>Estado</th></tr></thead>
                    <tbody>
                        {atendidos.map(t => (
                            <tr key={t.id}>
                                <td>{t.numero_atencion}</td>
                                <td><span className="badge badge-ok">{t.estado}</span></td>
                            </tr>
                        ))}
                        {atendidos.length === 0 && <tr><td colSpan="2">Sin registros aún.</td></tr>}
                    </tbody>
                </table>
            </div>

            {mostrarCrear && (
                <div className="modal-overlay" onClick={() => setMostrarCrear(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Generar nuevo ticket</h3>
                        <form onSubmit={crearTicket}>
                            <label>Paciente</label>
                            <select value={nuevoPaciente} onChange={(e) => setNuevoPaciente(e.target.value)} required>
                                <option value="">Selecciona un paciente</option>
                                {pacientes.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombres} {p.apellidos} ({p.rut})</option>
                                ))}
                            </select>
                            <button type="button" className="btn-link" onClick={() => setMostrarNuevoPaciente(true)}>
                                + Registrar paciente nuevo
                            </button>
                            <label>Área</label>
                            <select value={nuevoArea} onChange={(e) => setNuevoArea(e.target.value)}>
                                {Object.entries(AREAS).map(([id, nombre]) => (
                                    <option key={id} value={id}>{nombre}</option>
                                ))}
                            </select>
                            <div className="modal-actions">
                                <button type="button" className="btn-ghost" onClick={() => setMostrarCrear(false)}>Cancelar</button>
                                <button type="submit" disabled={creando}>{creando ? 'Generando...' : 'Generar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {mostrarNuevoPaciente && (
                <NuevoPacienteModal
                    onClose={() => setMostrarNuevoPaciente(false)}
                    onCreado={(paciente) => {
                        setPacientes(prev => [...prev, paciente]);
                        setNuevoPaciente(paciente.id);
                        setMostrarNuevoPaciente(false);
                    }}
                />
            )}
        </div>
    );
}