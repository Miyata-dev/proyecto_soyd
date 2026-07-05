import { useEffect, useState } from 'react';
import api from '../api/axiosConfig';
import NuevoPacienteModal from '../components/NuevoPacienteModal';

export default function Fichas() {
    const [fichas, setFichas] = useState([]);
    const [error, setError] = useState(null);
    const [pacientes, setPacientes] = useState([]);
    const [historial, setHistorial] = useState(null); // { ficha, registros, error }
    const [cargandoHistorial, setCargandoHistorial] = useState(false);
    const [mostrarCrear, setMostrarCrear] = useState(false);
    const [pacienteNuevo, setPacienteNuevo] = useState('');
    const [creando, setCreando] = useState(false);
    const [mensaje, setMensaje] = useState(null);
    const [nuevoDiagnostico, setNuevoDiagnostico] = useState('');
    const [nuevaObservacion, setNuevaObservacion] = useState('');
    const [registrando, setRegistrando] = useState(false);
    const [confirmarEliminar, setConfirmarEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);
    const [mostrarNuevoPaciente, setMostrarNuevoPaciente] = useState(false);

    const cargarFichas = () => {
        api.get('/fichas')
            .then(response => {
                setFichas(Array.isArray(response.data) ? response.data : []);
                setError(null);
            })
            .catch(err => {
                console.error("Detalle del error:", err);
                setError("No se pudieron cargar las fichas (Error de conexión o permisos).");
            });
    };

    const cargarPacientes = () => {
        api.get('/pacientes').then(res => setPacientes(res.data)).catch(() => setPacientes([]));
    };

    useEffect(() => {
        cargarFichas();
        cargarPacientes();
    }, []);

    const verHistorial = async (ficha) => {
        setCargandoHistorial(true);
        setHistorial({ ficha, registros: [] });
        setNuevoDiagnostico('');
        setNuevaObservacion('');
        try {
            const res = await api.get(`/fichas/${ficha.paciente_id}/historial`);
            setHistorial({ ficha, registros: res.data });
        } catch (err) {
            setHistorial({ ficha, registros: [], error: 'No se pudo cargar el historial.' });
        } finally {
            setCargandoHistorial(false);
        }
    };

    const crearFicha = async (e) => {
        e.preventDefault();
        if (!pacienteNuevo) return;
        setCreando(true);
        setMensaje(null);
        try {
            await api.post('/fichas', { paciente_id: pacienteNuevo });
            setMensaje({ tipo: 'exito', texto: 'Ficha creada con éxito.' });
            setMostrarCrear(false);
            setPacienteNuevo('');
            cargarFichas();
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'No se pudo crear la ficha.' });
        } finally {
            setCreando(false);
        }
    };

    // Registra una nueva atención (diagnóstico + observaciones) para la ficha
    // que está abierta en el historial, y refresca la lista al instante.
    const registrarAtencion = async (e) => {
        e.preventDefault();
        if (!historial) return;
        setRegistrando(true);
        try {
            await api.post('/atenciones', {
                ficha_id: historial.ficha.id,
                medico_id: localStorage.getItem('userId'),
                diagnostico: nuevoDiagnostico,
                observaciones: nuevaObservacion,
            });
            setNuevoDiagnostico('');
            setNuevaObservacion('');
            const res = await api.get(`/fichas/${historial.ficha.paciente_id}/historial`);
            setHistorial({ ficha: historial.ficha, registros: res.data });
        } catch (err) {
            setHistorial(h => ({ ...h, error: err.response?.data?.error || 'No se pudo registrar la atención.' }));
        } finally {
            setRegistrando(false);
        }
    };

    // Elimina la ficha (y su historial de atenciones asociado). Requiere
    // confirmación previa porque es una acción destructiva e irreversible.
    const eliminarFicha = async () => {
        if (!confirmarEliminar) return;
        setEliminando(true);
        try {
            await api.delete(`/fichas/${confirmarEliminar.id}`);
            setMensaje({ tipo: 'exito', texto: 'Ficha eliminada con éxito.' });
            setConfirmarEliminar(null);
            cargarFichas();
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'No se pudo eliminar la ficha.' });
        } finally {
            setEliminando(false);
        }
    };

    return (
        <div className="section-container">
            <div className="section-header">
                <h2>Fichas Clínicas</h2>
                <button onClick={() => setMostrarCrear(true)}>+ Nueva Ficha</button>
            </div>

            {mensaje && (
                <div className={`alert ${mensaje.tipo === 'exito' ? 'alert-success' : 'alert-error'}`}>
                    {mensaje.texto}
                </div>
            )}

            {error && <div className="card alert-error">{error}</div>}

            {!error && fichas.length === 0 && (
                <div className="card">
                    <p>No hay fichas registradas actualmente.</p>
                </div>
            )}

            <div className="cards-grid">
                {fichas.map((ficha) => (
                    <div key={ficha.id} className="card">
                        <h3>
                            {ficha.paciente_nombre
                                ? `${ficha.paciente_nombre} ${ficha.paciente_apellido || ''}`
                                : `Ficha ${String(ficha.id).slice(0, 8)}`}
                        </h3>
                        {ficha.paciente_rut && <p className="muted">RUT: {ficha.paciente_rut}</p>}
                        <p className="muted">
                            Creada: {ficha.fecha_creacion ? new Date(ficha.fecha_creacion).toLocaleDateString('es-CL') : '—'}
                        </p>
                        <div className="card-actions">
                            <button onClick={() => verHistorial(ficha)}>Ver Historial</button>
                            <button className="btn-danger btn-small" onClick={() => setConfirmarEliminar(ficha)}>
                                Eliminar
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {mostrarCrear && (
                <div className="modal-overlay" onClick={() => setMostrarCrear(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Nueva Ficha Clínica</h3>
                        <form onSubmit={crearFicha}>
                            <label>Paciente</label>
                            <select value={pacienteNuevo} onChange={(e) => setPacienteNuevo(e.target.value)} required>
                                <option value="">Selecciona un paciente</option>
                                {pacientes.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombres} {p.apellidos} ({p.rut})</option>
                                ))}
                            </select>
                            <button type="button" className="btn-link" onClick={() => setMostrarNuevoPaciente(true)}>
                                + Registrar paciente nuevo
                            </button>
                            <div className="modal-actions">
                                <button type="button" className="btn-ghost" onClick={() => setMostrarCrear(false)}>Cancelar</button>
                                <button type="submit" disabled={creando}>{creando ? 'Creando...' : 'Crear'}</button>
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
                        setPacienteNuevo(paciente.id);
                        setMostrarNuevoPaciente(false);
                    }}
                />
            )}

            {historial && (
                <div className="modal-overlay" onClick={() => setHistorial(null)}>
                    <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
                        <h3>Historial de Atenciones</h3>
                        {cargandoHistorial && <p>Cargando...</p>}
                        {historial.error && <p className="alert alert-error">{historial.error}</p>}
                        {!cargandoHistorial && historial.registros.length === 0 && (
                            <p>Sin atenciones registradas para esta ficha.</p>
                        )}
                        {historial.registros.map((r, idx) => (
                            <div key={idx} className="historial-item">
                                <p>
                                    <strong>{r.fecha_atencion ? new Date(r.fecha_atencion).toLocaleString('es-CL') : 'Sin fecha'}</strong>
                                    {' — '}{r.medico || 'Médico no registrado'}
                                </p>
                                <p>Diagnóstico: {r.diagnostico || '—'}</p>
                                <p className="muted">Observaciones: {r.observaciones || '—'}</p>
                            </div>
                        ))}

                        <form onSubmit={registrarAtencion} className="historial-form">
                            <label>Diagnóstico</label>
                            <textarea
                                value={nuevoDiagnostico}
                                onChange={(e) => setNuevoDiagnostico(e.target.value)}
                                placeholder="Ej: Faringitis aguda"
                                required
                            />
                            <label>Observaciones</label>
                            <textarea
                                value={nuevaObservacion}
                                onChange={(e) => setNuevaObservacion(e.target.value)}
                                placeholder="Notas adicionales (opcional)"
                            />
                            <div className="modal-actions">
                                <button type="button" className="btn-ghost" onClick={() => setHistorial(null)}>Cerrar</button>
                                <button type="submit" disabled={registrando}>
                                    {registrando ? 'Guardando...' : '+ Registrar atención'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {confirmarEliminar && (
                <div className="modal-overlay" onClick={() => setConfirmarEliminar(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>¿Eliminar esta ficha?</h3>
                        <p className="muted">
                            Se eliminará la ficha de{' '}
                            <strong>{confirmarEliminar.paciente_nombre || 'este paciente'}</strong>{' '}
                            junto con todo su historial de atenciones. Esta acción no se puede deshacer.
                        </p>
                        <div className="modal-actions">
                            <button type="button" className="btn-ghost" onClick={() => setConfirmarEliminar(null)}>
                                Cancelar
                            </button>
                            <button type="button" className="btn-danger" disabled={eliminando} onClick={eliminarFicha}>
                                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}