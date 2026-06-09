const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());

const pool = new Pool({
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'secretpassword',
    host: process.env.DB_HOST || 'clinica_db',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'clinica_db'
});

const verificarIdentidad = async (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const userRoleClient = req.headers['x-user-role'];

    if (!userId) {
        return res.status(401).json({ error: "Acceso denegado: Falta ID de usuario en los headers" });
    }

    try {
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

        //se encarga de que si tenga el rol.
        if (usuario.rol !== userRoleClient) {
            return res.status(403).json({
                error: `Alerta de Seguridad: El rol enviado (${userRoleClient}) no coincide con su rol real (${usuario.rol})`
            });
        }

        const esRutaFichaClinica = req.path.startsWith('/api/fichas') || req.path.startsWith('/api/atenciones');

        if (esRutaFichaClinica && !['MEDICO', 'ENFERMERA'].includes(usuario.rol)) {
            return res.status(403).json({
                error: "Acceso bloqueado en Gateway: Solo personal médico/enfermería puede acceder a la información clínica."
            });
        }

        req.headers['x-user-role'] = usuario.rol;
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
