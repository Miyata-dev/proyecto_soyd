const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
app.use(cors());

const verificarIdentidad = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    if (!userId || !userRole) {
        return res.status(401).json({ 
            error: "Acceso denegado en API Gateway: Faltan credenciales (ID o Rol)." 
        });
    }
    if (req.path.startsWith('/api/fichas') && !['MEDICO', 'ENFERMERA'].includes(userRole)) {
        return res.status(403).json({ 
            error: "Acceso bloqueado en Gateway: Solo personal médico/enfermería puede acceder a fichas." 
        });
    }

    next();
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
