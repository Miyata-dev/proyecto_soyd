import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Bodega from './pages/Bodega';
import Fichas from './pages/Fichas'; // Importamos el componente de Fichas
import Tickets from './pages/Tickets'; // Importamos el componente de Tickets
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta pública de autenticación */}
        <Route path="/login" element={<Login />} />

        {/* Rutas internas: requieren sesión iniciada (ver ProtectedRoute) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/bodega" element={<Bodega />} />
          <Route path="/fichas" element={<Fichas />} />
          <Route path="/tickets" element={<Tickets />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;