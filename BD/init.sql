CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- Habilita la extension para generar UUIDs

CREATE TYPE estado_ticket AS ENUM ('EN_ESPERA', 'LLAMADO', 'ATENDIDO');
CREATE TYPE tipo_personal AS ENUM ('MEDICO', 'ENFERMERA', 'ADMINISTRATIVO');
CREATE TYPE estado_pago AS ENUM ('PENDIENTE', 'CANCELADO', 'PAGADO');

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

INSERT INTO pacientes (rut, nombres, apellidos, fecha_nacimiento) VALUES 
('11111111-1', 'Juan', 'Perez', '1990-01-01'),
('22222222-2', 'Maria', 'Gomez', '1992-02-02'),
('33333333-3', 'Pedro', 'Lopez', '1988-03-03'),
('44444444-4', 'Ana', 'Diaz', '1995-04-04'),
('55555555-5', 'Luis', 'Torres', '1993-05-05')
ON CONFLICT (rut) DO NOTHING;

-- Insertar áreas de atención precargadas
INSERT INTO areas_atencion (nombre) VALUES 
('Medicina General'),
('Pediatría'),
('Odontología'),
('Traumatología'),
('Ginecología')
ON CONFLICT DO NOTHING;

-- Insertar personal de prueba
INSERT INTO personal (rut, nombres, apellidos, rol) VALUES 
('66666666-6', 'Carlos', 'Medina', 'MEDICO'),
('77777777-7', 'Laura', 'Sanchez', 'ENFERMERA'),
('88888888-8', 'Roberto', 'Admin', 'ADMINISTRATIVO')
ON CONFLICT (rut) DO NOTHING;