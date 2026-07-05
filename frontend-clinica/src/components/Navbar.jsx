import { NavLink, useNavigate } from 'react-router-dom';

export default function Navbar() {
    const navigate = useNavigate();
    const nombre = localStorage.getItem('userName') || 'Usuario';
    const rol = localStorage.getItem('userRole') || 'SIN ROL';

    const cerrarSesion = () => {
        localStorage.removeItem('userName');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        navigate('/login');
    };

    const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

    return (
        <header className="navbar">
            <div className="navbar-brand">
                <span className="navbar-logo">+</span>
                <span>Centro de Salud</span>
            </div>

            <nav className="navbar-links">
                <NavLink to="/" end className={linkClass}>Panel</NavLink>
                <NavLink to="/fichas" className={linkClass}>Fichas</NavLink>
                <NavLink to="/tickets" className={linkClass}>Llamados</NavLink>
                <NavLink to="/bodega" className={linkClass}>Bodega</NavLink>
            </nav>

            <div className="navbar-user">
                <div className="user-chip">
                    <span className="user-name">{nombre}</span>
                    <span className="role-pill">{rol}</span>
                </div>
                <button className="btn-ghost" onClick={cerrarSesion}>Cerrar sesión</button>
            </div>
        </header>
    );
}