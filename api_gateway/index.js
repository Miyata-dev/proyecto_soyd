const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
app.use(cors());

const verificarIdentidad = async (req, res, next) => {
    if (req.path === '/api/auth/login') {
        return next();
    }

    const userId = req.headers['x-user-id'];
    const userRoleClient = req.headers['x-user-role'];

    if (!userId) {
        return res.status(401).json({ error: "Acceso denegado: Falta ID de usuario" });
    }

    try {
        // Le preguntamos al Sistema de Fichas (que tiene la tabla 'personal') si el usuario existe
        const urlFichas = process.env.URL_FICHAS || 'http://localhost:3000';
        const response = await fetch(`${urlFichas}/api/auth/verify`, {
            headers: { 'x-user-id': userId }
        });

        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json(errorData);
        }

        const usuario = await response.json();

        if (usuario.rol !== userRoleClient) {
            return res.status(403).json({
                error: `Alerta: El rol enviado (${userRoleClient}) no coincide con el real (${usuario.rol})`
            });
        }

        const esRutaFichaClinica = req.path.startsWith('/api/fichas') || req.path.startsWith('/api/atenciones');
        if (esRutaFichaClinica && !['MEDICO', 'ENFERMERA'].includes(usuario.rol)) {
            return res.status(403).json({
                error: "Bloqueado: Solo personal médico puede acceder a información clínica."
            });
        }

        req.headers['x-user-role'] = usuario.rol;
        next();

    } catch (error) {
        console.error("Error al validar identidad desde Gateway:", error.message);
        return res.status(500).json({ error: "Error de comunicación interna del Gateway" });
    }
};

//se aplica el middleware de verificación de identidad a todas las rutas
app.use(verificarIdentidad);
const fixProxyHeaders = (proxyReq, req, res) => {
    if (req.headers['x-user-id']) {
        proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
    }
    if (req.headers['x-user-role']) {
        proxyReq.setHeader('x-user-role', req.headers['x-user-role']);
    }

    if (req.body && Object.keys(req.body).length) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
    }
};

app.use('/api/fichas', createProxyMiddleware({
    target: process.env.URL_FICHAS || 'http://localhost:3000',
    changeOrigin: true,
    onProxyReq: fixProxyHeaders
}));

app.use('/api/atenciones', createProxyMiddleware({
    target: process.env.URL_FICHAS || 'http://localhost:3000',
    changeOrigin: true,
    onProxyReq: fixProxyHeaders
}));

app.use('/api/tickets', createProxyMiddleware({
    target: process.env.URL_TICKETS || 'http://localhost:3001',
    changeOrigin: true,
    onProxyReq: fixProxyHeaders
}));

app.use('/api/bodega', createProxyMiddleware({
    target: process.env.URL_BODEGA || 'http://localhost:3002',
    changeOrigin: true,
    onProxyReq: fixProxyHeaders
}));

app.use('/api/auth', createProxyMiddleware({
    target: process.env.URL_FICHAS || 'http://sistema_fichas_app:3000',
    changeOrigin: true,
    onProxyReq: fixProxyHeaders
}));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`API Gateway ejecutándose en puerto ${PORT}`));