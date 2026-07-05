import { useState } from 'react';
import api from '../api/axiosConfig';

// Modal reutilizable para registrar un paciente nuevo (usado desde Fichas y
// Tickets). Al crear con éxito, entrega el paciente creado a través de
// onCreado para que la pantalla que lo llamó pueda seleccionarlo enseguida.
export default function NuevoPacienteModal({ onClose, onCreado }) {
    const [rut, setRut] = useState('');
    const [nombres, setNombres] = useState('');
    const [apellidos, setApellidos] = useState('');
    const [fechaNacimiento, setFechaNacimiento] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setEnviando(true);
        setError(null);
        try {
            const res = await api.post('/pacientes', {
                rut,
                nombres,
                apellidos,
                fecha_nacimiento: fechaNacimiento,
            });
            onCreado(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo registrar el paciente.');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h3>Registrar Paciente Nuevo</h3>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <label>RUT</label>
                    <input
                        type="text"
                        value={rut}
                        onChange={(e) => setRut(e.target.value)}
                        placeholder="Ej: 12345678-9"
                        required
                    />

                    <label>Nombres</label>
                    <input
                        type="text"
                        value={nombres}
                        onChange={(e) => setNombres(e.target.value)}
                        placeholder="Ej: María José"
                        required
                    />

                    <label>Apellidos</label>
                    <input
                        type="text"
                        value={apellidos}
                        onChange={(e) => setApellidos(e.target.value)}
                        placeholder="Ej: Rojas Díaz"
                        required
                    />

                    <label>Fecha de nacimiento</label>
                    <input
                        type="date"
                        value={fechaNacimiento}
                        onChange={(e) => setFechaNacimiento(e.target.value)}
                        required
                    />

                    <div className="modal-actions">
                        <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
                        <button type="submit" disabled={enviando}>{enviando ? 'Guardando...' : 'Registrar'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}