const express = require('express');
const cors = require('cors');
const config = require('./config');
const { log, crashLog } = require('./logger');
const { transformar } = require('./transformers');
const { reenviar } = require('./proxyClient');

const app = express();
app.use(cors());
app.use(express.json());

// Métricas en memoria para los SLI de la capa Middleware definidos en el SLA
// (disponibilidad de enrutamiento, tiempo de transformación, tasa de error).
const metrics = {
  totalRequests: 0,
  totalErrors: 0,
  latenciasMs: [],
};

// Mide la duración de cada solicitud y registra el resultado.
app.use((req, res, next) => {
  req._inicio = Date.now();
  res.on('finish', () => {
    const duracionMs = Date.now() - req._inicio;
    metrics.totalRequests += 1;
    metrics.latenciasMs.push(duracionMs);
    if (metrics.latenciasMs.length > 1000) metrics.latenciasMs.shift();

    const nivel = res.statusCode >= 500 ? 'ERROR' : 'INFO';
    log(nivel, 'Middleware', `${req.method} ${req.originalUrl} -> ${res.statusCode}`, {
      duracionMs,
      excedeSLA150ms: duracionMs > config.SLA_LATENCIA_MS,
    });
  });
  next();
});

// --- Endpoint de salud, usado por el orquestador para detectar caídas ---
app.get('/api/middleware/status', async (req, res) => {
  const estados = {};

  await Promise.all(
    Object.entries(config.SERVICES).map(async ([key, servicio]) => {
      try {
        const r = await reenviar({
          destino: key,
          method: 'GET',
          path: servicio.healthPath,
        });
        estados[key] = r.status < 500 ? 'ONLINE' : 'DEGRADADO';
      } catch (e) {
        estados[key] = 'OFFLINE';
      }
    })
  );

  const algunoCaido = Object.values(estados).includes('OFFLINE');
  res.status(algunoCaido ? 207 : 200).json({
    modulo: 'Middleware',
    estados_servicios: estados,
    timestamp: new Date().toISOString(),
  });
});

// --- Métricas / SLI de la capa Middleware ---
app.get('/api/middleware/metrics', (req, res) => {
  const latencias = metrics.latenciasMs;
  const promedio = latencias.length
    ? latencias.reduce((a, b) => a + b, 0) / latencias.length
    : 0;
  const max = latencias.length ? Math.max(...latencias) : 0;
  const tasaError = metrics.totalRequests
    ? (metrics.totalErrors / metrics.totalRequests) * 100
    : 0;

  res.json({
    totalRequests: metrics.totalRequests,
    totalErrors: metrics.totalErrors,
    latenciaPromedioMs: Number(promedio.toFixed(2)),
    latenciaMaximaMs: max,
    tasaErrorPorcentaje: Number(tasaError.toFixed(3)),
    slaLatenciaObjetivoMs: config.SLA_LATENCIA_MS,
  });
});

// --- Enrutamiento genérico ---
// Formato: /api/middleware/:origen/:destino/*resto
// Ejemplo:  POST /api/middleware/bodega/fichas/api/fichas
//           GET  /api/middleware/bodega/tickets/api/tickets
app.all('/api/middleware/:origen/:destino/*', async (req, res) => {
  const { origen, destino } = req.params;
  const ruta = `${origen}->${destino}`;
  const pathDestino = '/' + req.params[0];

  // Aislamiento de red: App1 y App2 nunca se comunican entre sí, ni
  // siquiera a través del Middleware. Sólo se permite tráfico donde
  // Bodega (App3) es uno de los dos extremos.
  if (!config.RUTAS_PERMITIDAS.has(ruta)) {
    crashLog({
      componenteAfectado: 'Middleware - Enrutamiento',
      tipoFalla: `Ruta no permitida: ${ruta}`,
      accionEjecutada: 'Solicitud bloqueada por política de aislamiento de red',
    });
    return res.status(403).json({
      error: `Ruta no permitida: ${origen} -> ${destino}. App1 y App2 están aisladas entre sí.`,
    });
  }

  try {
    const payloadTransformado = transformar(ruta, req.body);

    const resultado = await reenviar({
      destino,
      method: req.method,
      path: pathDestino,
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-user-role': req.headers['x-user-role'],
        'x-origen-middleware': origen,
      },
      body: payloadTransformado,
    });

    return res.status(resultado.status).json(resultado.data);
  } catch (error) {
    metrics.totalErrors += 1;
    const esTimeout = error.name === 'AbortError';

    crashLog({
      componenteAfectado: `Middleware -> ${config.SERVICES[destino]?.name || destino}`,
      tipoFalla: esTimeout ? 'Timeout de comunicación' : error.message,
      accionEjecutada: 'Se retorna error al origen sin reintento automático',
    });

    return res.status(esTimeout ? 504 : 502).json({
      error: 'Error de comunicación a través del Middleware',
      detalle: error.message,
      destino,
    });
  }
});

const server = app.listen(config.PORT, () => {
  log('INFO', 'Middleware', `Middleware escuchando en puerto ${config.PORT}`);
});

// Apagado ordenado: relevante para la métrica de "resiliencia ante caída"
// del SLA (reanudación del tráfico en <=45s tras un reinicio del servicio).
process.on('SIGTERM', () => {
  log('INFO', 'Middleware', 'SIGTERM recibido, cerrando conexiones activas...');
  server.close(() => process.exit(0));
});

module.exports = app;
