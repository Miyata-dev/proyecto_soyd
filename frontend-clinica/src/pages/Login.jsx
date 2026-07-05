import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig'; // Importamos tu conexión configurada

export default function Login() {
    const [nombres, setNombres] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [mensajeError, setMensajeError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setMensajeError('');

        if (!nombres.trim() || !contrasena.trim()) {
            setMensajeError('Por favor ingresa tu nombre y contraseña.');
            return;
        }

        try {
            // Hacemos la petición POST a la URL de tu API Gateway
            const response = await api.post('/auth/login', {
                nombres: nombres,
                contrasena: contrasena
            });

            // Si es exitoso, extraemos los datos que envía tu nuevo backend
            const { usuario } = response.data;

            // Guardamos las credenciales reales en la memoria del navegador
            localStorage.setItem('userName', `${usuario.nombres} ${usuario.apellidos}`);
            localStorage.setItem('userId', usuario.id);
            localStorage.setItem('userRole', usuario.rol);

            // Redirigimos al menú principal
            navigate('/'); 

        } catch (error) {
            // Capturamos el error 401 o 500 que configuraste en tu backend
            if (error.response && error.response.data.error) {
                setMensajeError(error.response.data.error);
            } else {
                setMensajeError('Error de conexión con el servidor.');
            }
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo">+</div>
                <h2>Iniciar Sesión</h2>
                <p>Ingresa tus credenciales para acceder al sistema.</p>

                <form onSubmit={handleLogin}>
                    <label>Nombre</label>
                    <input
                        type="text"
                        value={nombres}
                        onChange={(e) => setNombres(e.target.value)}
                        placeholder="Ingresa tu nombre exacto"
                    />

                    <label>Contraseña</label>
                    <input
                        type="password"
                        value={contrasena}
                        onChange={(e) => setContrasena(e.target.value)}
                        placeholder="Ingresa tu contraseña"
                    />

                    {/* Si hay error (ej: 401 Incorrecto), lo mostramos */}
                    {mensajeError && (
                        <div className="login-error">❌ {mensajeError}</div>
                    )}

                    <button type="submit">Ingresar</button>
                </form>
            </div>
        </div>
    );
}