CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE tipo_personal AS ENUM ('MEDICO', 'ENFERMERA', 'ADMINISTRATIVO');

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
  contrasena VARCHAR(255) NOT NULL
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
  ticket_asociado_id UUID, -- Referencia a la App 1 (MariaDB)
  diagnostico TEXT,
  observaciones TEXT,
  fecha_atencion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_atenciones_medico ON atenciones_medicas(medico_id);
CREATE INDEX idx_fichas_paciente ON fichas_clinicas(paciente_id);

INSERT INTO pacientes (rut, nombres, apellidos, fecha_nacimiento) VALUES 
('11111111-1', 'Juan', 'Perez', '1990-01-01'),
('22222222-2', 'Maria', 'Gomez', '1992-02-02');

INSERT INTO personal (rut, nombres, apellidos, rol, contrasena) VALUES 
('66666666-6', 'Carlos', 'Medina', 'MEDICO', '1234'),
('77777777-7', 'Laura', 'Sanchez', 'ENFERMERA', '5678'),
('88888888-8', 'Roberto', 'Admin', 'ADMINISTRATIVO', 'admin');