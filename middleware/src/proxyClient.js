const config = require('./config');

// Reenvía una solicitud al microservicio destino, aplicando un timeout
// duro (config.TIMEOUT_MS) para no dejar conexiones colgadas si el
// servicio destino no responde.
async function reenviar({ destino, method, path, headers = {}, body }) {
  const servicio = config.SERVICES[destino];
  if (!servicio) {
    throw new Error(`Servicio destino desconocido: ${destino}`);
  }

  const url = `${servicio.baseUrl}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: ['GET', 'HEAD'].includes(method) ? undefined : JSON.stringify(body || {}),
      signal: controller.signal,
    });

    const contentType = resp.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await resp.json().catch(() => ({}))
      : await resp.text();

    return { status: resp.status, data };
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = { reenviar };
