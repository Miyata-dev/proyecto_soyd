CREATE TABLE IF NOT EXISTS areas_atencion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL 
);

CREATE TABLE IF NOT EXISTS tickets (
  id CHAR(36) PRIMARY KEY DEFAULT UUID(),
  paciente_id CHAR(36) NOT NULL, -- Referencia lógica a App 2 (PostgreSQL)
  area_id INT NOT NULL,
  numero_atencion VARCHAR(10) NOT NULL, 
  estado ENUM('EN_ESPERA', 'LLAMADO', 'ATENDIDO') DEFAULT 'EN_ESPERA', 
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_llamado TIMESTAMP NULL,
  FOREIGN KEY (area_id) REFERENCES areas_atencion(id)
);

CREATE TABLE IF NOT EXISTS pagos_atencion (
  id CHAR(36) PRIMARY KEY DEFAULT UUID(),
  ticket_id CHAR(36) UNIQUE NOT NULL,
  monto DECIMAL(10, 2) NOT NULL,
  estado_pago ENUM('PENDIENTE', 'CANCELADO', 'PAGADO') DEFAULT 'PENDIENTE', 
  fecha_pago TIMESTAMP NULL,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE INDEX idx_tickets_estado ON tickets(estado);

INSERT INTO areas_atencion (nombre) VALUES 
('Medicina General'), ('Pediatría'), ('Odontología'), ('Traumatología'), ('Ginecología');