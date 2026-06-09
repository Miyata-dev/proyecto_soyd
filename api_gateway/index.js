const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const { Pool } = require('pg'); // <-- 1. Importamos la librería de BD

const app = express();
app.use(cors());

// <-- 2. Creamos la conexión a PostgreSQL para el Gateway
const pool = new Pool({
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'secretpassword',
    host: process.env.DB_HOST || 'clinica_db',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'clinica_db'
});

// <-- 3. Agregamos "async" a la función
const verificarIdentidad = async (req, res, next) => {
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({ error: "Acceso denegado: Falta ID de usuario en los headers" });
    }

    try {
        // Consultamos a la base de datos si el ID es real
        const result = await pool.query(
            'SELECT rol, activo FROM personal WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Acceso denegado: Usuario no existe en la base de datos" });
        }

        const usuario = result.rows[0];

        if (!usuario.activo) {
            return res.status(403).json({ error: "Acceso denegado: El usuario está inactivo" });
        }

        // Si intenta entrar a fichas, verificamos el rol
        if (req.path.startsWith('/api/fichas') && !['MEDICO', 'ENFERMERA'].includes(usuario.rol)) {
            return res.status(403).json({ error: "Acceso bloqueado en Gateway: Solo personal médico/enfermería puede acceder a fichas." });
        }

        // Si pasó todas las pruebas, lo dejamos seguir hacia los microservicios
        next();

    } catch (error) {
        console.error("Error al validar identidad en BD desde el Gateway:", error.message);
        return res.status(500).json({ error: "Error interno (posible formato de ID inválido)" });
    }
};

app.use('/api', verificarIdentidad);


app.use('/api/fichas', createProxyMiddleware({
    target: process.env.URL_FICHAS || 'http://localhost:3000',
    changeOrigin: true,
    ws: true
}));

app.use('/api/atenciones', createProxyMiddleware({
    target: process.env.URL_FICHAS || 'http://localhost:3000',
    changeOrigin: true,
    ws: true
}));


app.use('/api/tickets', createProxyMiddleware({
    target: process.env.URL_TICKETS || 'http://localhost:3001',
    changeOrigin: true,
    ws: true
}));


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`API Gateway ejecutándose en el puerto ${PORT}`);
});
