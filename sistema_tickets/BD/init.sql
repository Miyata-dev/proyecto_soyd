CREATE TABLE IF NOT EXISTS areas_atencion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL 
);

CREATE TABLE IF NOT EXISTS tickets (
  id CHAR(36) PRIMARY KEY DEFAULT UUID(),
  paciente_id CHAR(36) NOT NULL, -- Referencia al paciente
  area_id INT NOT NULL,
  numero_atencion VARCHAR(10) NOT NULL, 
  estado ENUM('EN_ESPERA', 'LLAMADO', 'ATENDIDO') DEFAULT 'EN_ESPERA', 
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_llamado TIMESTAMP NULL,
  FOREIGN KEY (area_id) REFERENCES areas_atencion(id)
);

CREATE INDEX idx_tickets_estado ON tickets(estado);

INSERT INTO areas_atencion (nombre) VALUES 
('Medicina General'), ('Pediatría'), ('Odontología'), ('Traumatología'), ('Ginecología');