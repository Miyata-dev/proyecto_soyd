require('dotenv').config();

// Definición de los tres microservicios que el Middleware conoce.
// healthPath: ruta usada para el chequeo de salud (ajústala si tu app expone otra).
const SERVICES = {
  tickets: {
    name: 'Aplicación 1 - Tickets',
    baseUrl: process.env.URL_TICKETS || 'http://localhost:3001',
    healthPath: '/',
  },
  fichas: {
    name: 'Aplicación 2 - Fichas',
    baseUrl: process.env.URL_FICHAS || 'http://localhost:3000',
    healthPath: '/',
  },
  bodega: {
    name: 'Aplicación 3 - Bodega',
    baseUrl: process.env.URL_BODEGA || 'http://localhost:5000',
    healthPath: '/api/bodega/status',
  },
};

// Regla de aislamiento de red (definida en el Avance de Proyecto):
// App1 (tickets) y App2 (fichas) NUNCA se comunican entre sí, ni directa
// ni indirectamente a través del Middleware. Todo tráfico permitido
// involucra a Bodega (App3) como uno de los dos extremos.
const RUTAS_PERMITIDAS = new Set([
  'bodega->tickets',
  'tickets->bodega',
  'bodega->fichas',
  'fichas->bodega',
]);

module.exports = {
  PORT: process.env.PORT || 8090,
  TIMEOUT_MS: parseInt(process.env.TIMEOUT_MS || '5000', 10),
  SLA_LATENCIA_MS: 150, // objetivo de transformación/enrutamiento definido en el SLA
  SERVICES,
  RUTAS_PERMITIDAS,
};
