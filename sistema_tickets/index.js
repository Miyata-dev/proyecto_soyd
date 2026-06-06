const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');
const Redis = require('ioredis'); //redis cache

// Inicializa la aplicación
const app = express();
app.use(cors());
app.use(express.json());

// Crear el servidor HTTP y WebSockets
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// --- CONEXIÓN A BASE DE DATOS POSTGRESQL (DOCKER) ---
const pool = new Pool({
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'secretpassword',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    database: process.env.DB_NAME || 'clinica_db'
});

// Verificar conexión a la BD
pool.connect()
    .then(() => console.log('Conectado exitosamente a PostgreSQL (Docker)'))
    .catch(err => console.error('Error al conectar a PostgreSQL', err.stack));


const redis = new Redis({
    host: process.env.REDIS_HOST || 'clinica_redis',
    port: 6379
});
const CACHE_KEY = 'tickets:todos';
const CACHE_TTL = 30; // segundos

// 1. GET: Obtener todos los tickets
app.get('/api/tickets', async (req, res) => {
    try {
        // 1. Revisar cache
        const cached = await redis.get(CACHE_KEY);
        if (cached) {
            console.log('Cache HIT - tickets desde Redis');
            return res.json(JSON.parse(cached));
        }

        // 2. Cache miss → consultar BD
        console.log('Cache MISS - consultando PostgreSQL');
        const result = await pool.query('SELECT * FROM tickets ORDER BY fecha_creacion DESC');
        
        // 3. Guardar en Redis con expiración
        await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(result.rows));
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener tickets:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// 2. POST: Generar un Ticket de Atención
app.post('/api/tickets', async (req, res) => {
    const { paciente_id, area_id, numero_atencion } = req.body;
    
    try {
        const query = `
            INSERT INTO tickets (paciente_id, area_id, numero_atencion) 
            VALUES ($1, $2, $3) 
            RETURNING *;
        `;
        const values = [paciente_id, area_id, numero_atencion];
        const result = await pool.query(query, values);
        
        await redis.del(CACHE_KEY);
        // Respondemos a Postman con el ticket real creado en la BD
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear ticket:', error);
        res.status(500).json({ error: 'Error interno del servidor al crear el ticket' });
    }
});

// 3. PATCH: Llamar al Paciente (Y emitir WebSocket)
app.patch('/api/tickets/:id/llamar', async (req, res) => {
    const ticketId = req.params.id;
    
    try {
        const query = `
            UPDATE tickets 
            SET estado = 'LLAMADO', fecha_llamado = CURRENT_TIMESTAMP 
            WHERE id = $1 
            RETURNING *;
        `;
        const result = await pool.query(query, [ticketId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Ticket no encontrado en la base de datos" });
        }

        const ticketActualizado = result.rows[0];

        // Emitimos el evento a todas las pantallas conectadas
        io.emit('nuevo_llamado', ticketActualizado);

        await redis.del(CACHE_KEY)
        // Respondemos a la interfaz que hizo la llamada
        res.json(ticketActualizado);
    } catch (error) {
        console.error('Error al llamar paciente:', error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar el ticket' });
    }
});

// 4. DELETE: Borrar un ticket por su ID
app.delete('/api/tickets/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM tickets WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "Ticket no encontrado" });
         await redis.del(CACHE_KEY);
        res.json({ message: "Ticket eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el ticket' });
    }
});

// Arrancar el servidor
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT} (Conectado a Docker)`);
});