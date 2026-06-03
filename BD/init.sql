CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- Habilita la extension para generar UUIDs

CREATE TYPE IF NOT EXISTS estado_ticket AS ENUM ('EN_ESPERA', 'LLAMADO', 'ATENDIDO');
CREATE TYPE IF NOT EXISTS tipo_personal AS ENUM ('MEDICO', 'ENFERMERA', 'ADMINISTRATIVO');
CREATE TYPE IF NOT EXISTS estado_pago AS ENUM ('PENDIENTE', 'CANCELADO', 'PAGADO');

CREATE TABLE IF NOT EXISTS pacientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rut VARCHAR(12) UNIQUE NOT NULL,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS personal (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rut VARCHAR(12) UNIQUE NOT NULL,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  rol tipo_personal NOT NULL,
  activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS areas_atencion (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL 
);

CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id),
  area_id INTEGER NOT NULL REFERENCES areas_atencion(id),
  numero_atencion VARCHAR(10) NOT NULL, 
  estado estado_ticket DEFAULT 'EN_ESPERA', 
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_llamado TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pagos_atencion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID UNIQUE NOT NULL REFERENCES tickets(id),
  monto DECIMAL(10, 2) NOT NULL,
  estado_pago estado_pago DEFAULT 'PENDIENTE', 
  fecha_pago TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fichas_clinicas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID UNIQUE NOT NULL REFERENCES pacientes(id),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS atenciones_medicas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ficha_id UUID NOT NULL REFERENCES fichas_clinicas(id),
  medico_id UUID NOT NULL REFERENCES personal(id),
  ticket_asociado_id UUID REFERENCES tickets(id), 
  diagnostico TEXT,
  observaciones TEXT,
  fecha_atencion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recetas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  atencion_id UUID NOT NULL REFERENCES atenciones_medicas(id),
  medicamentos TEXT NOT NULL,
  indicaciones TEXT NOT NULL,
  fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS derivaciones_examenes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  atencion_id UUID NOT NULL REFERENCES atenciones_medicas(id),
  tipo_examen VARCHAR(100) NOT NULL,
  estado VARCHAR(20) DEFAULT 'SOLICITADO',
  fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tickets_estado ON tickets(estado);
CREATE INDEX idx_atenciones_medico ON atenciones_medicas(medico_id);
CREATE INDEX idx_fichas_paciente ON fichas_clinicas(paciente_id);