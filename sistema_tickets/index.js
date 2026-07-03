const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mariadb = require('mariadb');
const Redis = require('ioredis');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const pool = mariadb.createPool({
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'secretpassword',
    host: process.env.DB_HOST || 'tickets_db',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'tickets_db'
});


pool.getConnection()
    .then(() => console.log('Conectado exitosamente a MariaDB'))
    .catch(err => console.error('Error al conectar a MariaDB', err.stack));


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
        console.log('Cache MISS - consultando MariaDB');
        const result = await pool.query('SELECT * FROM tickets ORDER BY fecha_creacion DESC');

        // 3. Guardar en Redis con expiración
        await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(result));

        res.json(result);
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
            VALUES (?, ?, ?) 
            RETURNING *;
        `;
        const values = [paciente_id, area_id, numero_atencion];
        const result = await pool.query(query, values);

        await redis.del(CACHE_KEY);
        // Respondemos a Postman con el ticket real creado en la BD
        res.status(201).json(result[0]);
    } catch (error) {
        console.error('Error al crear ticket:', error);
        res.status(500).json({ error: 'Error interno del servidor al crear el ticket' });
    }
});

// 3. PATCH: Llamar al Paciente 
app.patch('/api/tickets/:id/llamar', async (req, res) => {
    const ticketId = req.params.id;

    try {
        // 1. Ejecutamos el UPDATE sin el RETURNING que causaba el conflicto en MariaDB
        const queryUpdate = `
            UPDATE tickets 
            SET estado = 'LLAMADO', fecha_llamado = CURRENT_TIMESTAMP 
            WHERE id = ?;
        `;
        const resultUpdate = await pool.query(queryUpdate, [ticketId]);

        // 2. En MariaDB validamos con affectedRows si el ID existía
        if (resultUpdate.affectedRows === 0) {
            return res.status(404).json({ error: "Ticket no encontrado en la base de datos" });
        }

        // 3. Consultamos el ticket recién actualizado para enviarlo al WebSocket y al usuario
        const ticketActualizado = await pool.query('SELECT * FROM tickets WHERE id = ?', [ticketId]);

        // Emitimos el evento a todas las pantallas conectadas
        io.emit('nuevo_llamado', ticketActualizado[0]);

        await redis.del(CACHE_KEY);
        
        // Respondemos a la interfaz que hizo la llamada
        res.json(ticketActualizado[0]);
    } catch (error) {
        console.error('Error al llamar paciente:', error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar el ticket' });
    }
});

// 4. DELETE: Borrar un ticket por su ID
app.delete('/api/tickets/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM tickets WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: "Ticket no encontrado" });
        await redis.del(CACHE_KEY);
        res.json({ message: "Ticket eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el ticket' });
    }
});

// Arrancar el servidor
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor de Tickets corriendo en puerto ${PORT}`);
});