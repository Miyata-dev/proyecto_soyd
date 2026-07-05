import { Navigate, Outlet } from 'react-router-dom';
import Navbar from './Navbar';

// Protege las rutas internas: si no hay sesión iniciada, redirige a /login.
// Si hay sesión, dibuja la Navbar persistente y el contenido de la ruta (Outlet).
export default function ProtectedRoute() {
    const userId = localStorage.getItem('userId');

    if (!userId) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="app-shell">
            <Navbar />
            <main className="app-main">
                <Outlet />
            </main>
        </div>
    );
}