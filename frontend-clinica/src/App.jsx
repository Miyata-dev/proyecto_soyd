import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Bodega from './pages/Bodega';
import Fichas from './pages/Fichas'; // Importamos el componente de Fichas
import Tickets from './pages/Tickets'; // Importamos el componente de Tickets

function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas de autenticación y navegación principal */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
        
        {/* Rutas de los microservicios */}
        <Route path="/bodega" element={<Bodega />} />
        <Route path="/fichas" element={<Fichas />} />
        <Route path="/tickets" element={<Tickets />} />
      </Routes>
    </Router>
  );
}

export default App;