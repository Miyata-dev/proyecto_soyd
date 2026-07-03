const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'secretpassword',
    host: process.env.DB_HOST || 'fichas_db',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'fichas_db'
});

// Middleware simple de autorización
const verificarPersonalAutorizado = (req, res, next) => {
    const rol = req.headers['x-user-role'];
    if (rol === 'MEDICO' || rol === 'ENFERMERA') {
        next();
    } else {
        res.status(403).json({ error: "Acceso denegado: Se requiere personal autorizado" });
    }
};

app.get('/api/auth/verify', async (req, res) => {
    const userId = req.headers['x-user-id'];
    try {
        const result = await pool.query('SELECT rol, activo FROM personal WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Usuario no existe" });
        }
        if (!result.rows[0].activo) {
            return res.status(403).json({ error: "Usuario inactivo" });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Error validando en BD Fichas" });
    }
});

// 1. GET: Obtener todas las fichas
app.get('/api/fichas', verificarPersonalAutorizado, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM fichas_clinicas ORDER BY fecha_creacion DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las fichas' });
    }
});

// GET: Obtener todas las atenciones médicas registradas
app.get('/api/atenciones', verificarPersonalAutorizado, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM atenciones_medicas ORDER BY fecha_atencion DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las atenciones' });
    }
});

// 2. POST: Crear una ficha clínica inicial
app.post('/api/fichas', verificarPersonalAutorizado, async (req, res) => {
    const { paciente_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO fichas_clinicas (paciente_id) VALUES ($1) RETURNING *',
            [paciente_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear la ficha clínica' });
    }
});

// 3. POST: Registrar una atención médica (Diagnóstico y Ticket asociado)
app.post('/api/atenciones', verificarPersonalAutorizado, async (req, res) => {
    const { ficha_id, medico_id, ticket_asociado_id, diagnostico, observaciones } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO atenciones_medicas (ficha_id, medico_id, ticket_asociado_id, diagnostico, observaciones) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [ficha_id, medico_id, ticket_asociado_id, diagnostico, observaciones]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar la atención' });
    }
});

// 4. GET: Obtener el historial completo de un paciente
app.get('/api/fichas/:paciente_id/historial', verificarPersonalAutorizado, async (req, res) => {
    const { paciente_id } = req.params;
    try {
        const query = `
            SELECT f.id as ficha_id, a.fecha_atencion, a.diagnostico, a.observaciones, p.nombres as medico
            FROM fichas_clinicas f
            LEFT JOIN atenciones_medicas a ON f.id = a.ficha_id
            LEFT JOIN personal p ON a.medico_id = p.id
            WHERE f.paciente_id = $1
            ORDER BY a.fecha_atencion DESC;
        `;
        const result = await pool.query(query, [paciente_id]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener historial' });
    }
});

// 5. PATCH: Actualizar una atención médica (Modificar diagnóstico u observaciones)
app.patch('/api/atenciones/:id', verificarPersonalAutorizado, async (req, res) => {
    const { id } = req.params;
    const { diagnostico, observaciones } = req.body;

    try {
        const result = await pool.query(
            `UPDATE atenciones_medicas 
             SET diagnostico = COALESCE($1, diagnostico),
                 observaciones = COALESCE($2, observaciones)
             WHERE id = $3 
             RETURNING *`,
            [diagnostico, observaciones, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Atención médica no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar la atención' });
    }
});

// 6. DELETE: Eliminar una atención médica específica
app.delete('/api/atenciones/:id', verificarPersonalAutorizado, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM atenciones_medicas WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Atención médica no encontrada' });
        }

        res.json({
            mensaje: 'Atención médica eliminada con éxito',
            atencion_eliminada: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar la atención' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sistema de Fichas corriendo en puerto ${PORT}`));