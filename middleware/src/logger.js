function log(nivel, componente, mensaje, extra = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    nivel,
    componente,
    mensaje,
    ...extra,
  };
  const linea = JSON.stringify(entry);

  if (nivel === 'ERROR' || nivel === 'CRITICAL') {
    console.error(linea);
  } else {
    console.log(linea);
  }
  return entry;
}

// El SLA exige: "El 100% de las pérdidas de conectividad con servidores
// principales generarán un registro de diagnóstico local (crash log) de
// forma instantánea". Cada registro contiene: timestamp, componente
// afectado, tipo de falla y acción ejecutada.
function crashLog({ componenteAfectado, tipoFalla, accionEjecutada }) {
  return log('CRITICAL', componenteAfectado, 'Falla de comunicación detectada', {
    tipoFalla,
    accionEjecutada,
  });
}

module.exports = { log, crashLog };
