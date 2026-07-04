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
        <div style={{ padding: '50px', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
            <h2> Iniciar Sesión</h2>
            <p>Ingresa tus credenciales para acceder al sistema.</p>
            
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                <div style={{ textAlign: 'left' }}>
                    <label>Nombre:</label>
                    <input
                        type="text"
                        value={nombres}
                        onChange={(e) => setNombres(e.target.value)}
                        placeholder="Ingresa tu nombre exacto"
                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                </div>
                
                <div style={{ textAlign: 'left' }}>
                    <label>Contraseña:</label>
                    <input
                        type="password"
                        value={contrasena}
                        onChange={(e) => setContrasena(e.target.value)}
                        placeholder="Ingresa tu contraseña"
                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                </div>

                {/* Si hay error (ej: 401 Incorrecto), lo mostramos en rojo */}
                {mensajeError && (
                    <div style={{ color: 'red', fontSize: '14px', fontWeight: 'bold' }}>
                        ❌ {mensajeError}
                    </div>
                )}
                
                <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer', marginTop: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>
                    Ingresar
                </button>
            </form>
        </div>
    );
}