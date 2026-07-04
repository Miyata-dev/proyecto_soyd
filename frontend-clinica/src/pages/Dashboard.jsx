import { Link, useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const navigate = useNavigate();

    const nombreActual = localStorage.getItem('userName') || 'Usuario Desconocido';
    const rolActual = localStorage.getItem('userRole') || 'SIN ROL';

    const cerrarSesion = () => {
        localStorage.removeItem('userName');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        navigate('/login'); 
    };

    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1>Panel Central del Centro de Salud</h1>
            
            <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '8px', display: 'inline-block', marginBottom: '20px' }}>
                <p style={{ margin: '0 0 10px 0' }}>
                    Conectado como: <strong>{nombreActual}</strong> ({rolActual})
                </p>
                <button onClick={cerrarSesion} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>
                    Cerrar Sesión
                </button>
            </div>

            <p>Seleccione el módulo al que desea ingresar:</p>
            
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '30px' }}>
                <Link to="/fichas"><button style={{ padding: '10px 20px' }}>Fichas Clínicas</button></Link>
                <Link to="/tickets"><button style={{ padding: '10px 20px' }}> Llamado Pacientes</button></Link>
                <Link to="/bodega"><button style={{ padding: '10px 20px' }}>Bodega e Inventario</button></Link>
            </div>
        </div>
    );
}