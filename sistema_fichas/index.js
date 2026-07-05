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

// 1. GET: Obtener todas las fichas (con datos reales del paciente asociado)
app.get('/api/fichas', verificarPersonalAutorizado, async (req, res) => {
    try {
        const query = `
            SELECT f.id, f.paciente_id, f.fecha_creacion,
                   p.nombres AS paciente_nombre, p.apellidos AS paciente_apellido, p.rut AS paciente_rut
            FROM fichas_clinicas f
            JOIN pacientes p ON f.paciente_id = p.id
            ORDER BY f.fecha_creacion DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las fichas' });
    }
});

// GET: Obtener el listado de pacientes (para seleccionarlos al crear fichas o tickets)
app.get('/api/pacientes', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, rut, nombres, apellidos, fecha_nacimiento FROM pacientes ORDER BY nombres ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los pacientes' });
    }
});

// POST: Registrar un paciente nuevo (usado por recepción o personal clínico).
// Este endpoint pertenece exclusivamente a App2: no requiere ni provoca
// ninguna llamada hacia App1 (Tickets). El aislamiento de red entre ambas
// aplicaciones se mantiene intacto.
app.post('/api/pacientes', async (req, res) => {
    const { rut, nombres, apellidos, fecha_nacimiento } = req.body;

    if (!rut || !nombres || !apellidos || !fecha_nacimiento) {
        return res.status(400).json({ error: 'Debes completar RUT, nombres, apellidos y fecha de nacimiento.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO pacientes (rut, nombres, apellidos, fecha_nacimiento) VALUES ($1, $2, $3, $4) RETURNING *',
            [rut, nombres, apellidos, fecha_nacimiento]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Ya existe un paciente registrado con ese RUT.' });
        }
        res.status(500).json({ error: 'Error al registrar el paciente' });
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

// 2b. DELETE: Eliminar una ficha clínica junto con su historial de atenciones
app.delete('/api/fichas/:id', verificarPersonalAutorizado, async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Primero borramos las atenciones asociadas (la FK lo exige),
        // luego la ficha. Todo dentro de una transacción para que sea
        // todo o nada.
        await client.query('DELETE FROM atenciones_medicas WHERE ficha_id = $1', [id]);
        const result = await client.query('DELETE FROM fichas_clinicas WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Ficha no encontrada' });
        }

        await client.query('COMMIT');
        res.json({
            mensaje: 'Ficha eliminada con éxito (junto con su historial de atenciones)',
            ficha_eliminada: result.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error al eliminar la ficha' });
    } finally {
        client.release();
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

app.post('/api/auth/login', async (req, res) => {
    const { nombres, contrasena } = req.body;

    if (!nombres || !contrasena) {
        return res.status(400).json({ error: "Falta el nombre o la contraseña" });
    }

    try {
        const result = await pool.query(
            'SELECT id, nombres, apellidos, rol, activo FROM personal WHERE nombres = $1 AND contrasena = $2',
            [nombres, contrasena]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Nombre de usuario o contraseña incorrectos" });
        }

        const usuario = result.rows[0];

        res.status(200).json({
            mensaje: "Login exitoso",
            usuario: {
                id: usuario.id,
                nombres: usuario.nombres,
                apellidos: usuario.apellidos,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error("Error en el login:", error);
        res.status(500).json({ error: "Error interno del servidor al validar credenciales" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sistema de Fichas corriendo en puerto ${PORT}`));