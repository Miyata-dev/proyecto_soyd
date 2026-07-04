// Este módulo centraliza la "transformación de formatos" que el diseño
// exige al Middleware antes de reenviar datos entre Bodega y los sistemas
// de atención. Como todavía no está definida la lógica de negocio exacta,
// se entrega un transformador identidad (passthrough) para todas las rutas.
//
// Cuando definan el flujo real (por ejemplo: "al despachar un insumo se
// registra una observación en la ficha del paciente"), agreguen una
// función nueva y regístrenla en TRANSFORMERS con la clave "origen->destino".

function identidad(payload) {
  return payload;
}

// Ejemplo de referencia (no activo). Déjenlo comentado como guía para el
// resto del equipo hasta que se defina el caso de uso real:
//
// function bodegaAFichas(payload) {
//   return {
//     paciente_id: payload.personal_solicitante_id,
//     observaciones: `Despacho de insumo ${payload.codigo_producto} x${payload.cantidad}`,
//   };
// }

const TRANSFORMERS = {
  default: identidad,
  // 'bodega->fichas': bodegaAFichas,
};

function transformar(ruta, payload) {
  const fn = TRANSFORMERS[ruta] || TRANSFORMERS.default;
  return fn(payload || {});
}

module.exports = { transformar, TRANSFORMERS };
