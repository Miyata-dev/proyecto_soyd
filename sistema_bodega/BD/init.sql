CREATE TABLE IF NOT EXISTS categorias_insumos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT
);

CREATE TABLE IF NOT EXISTS inventario (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  categoria_id INT NOT NULL,
  codigo_producto VARCHAR(50) UNIQUE NOT NULL,
  nombre_producto VARCHAR(150) NOT NULL,
  cantidad_stock INT DEFAULT 0,
  stock_critico INT DEFAULT 10,
  unidad_medida VARCHAR(20) NOT NULL,
  fecha_ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias_insumos(id)
);

CREATE TABLE IF NOT EXISTS movimientos_bodega (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  inventario_id CHAR(36) NOT NULL,
  tipo_movimiento ENUM('INGRESO', 'EGRESO', 'AJUSTE') NOT NULL,
  cantidad INT NOT NULL,
  personal_solicitante_id CHAR(36), -- Referencia lógica a App 2
  fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  observaciones TEXT,
  FOREIGN KEY (inventario_id) REFERENCES inventario(id)
);

INSERT INTO categorias_insumos (nombre, descripcion) VALUES 
('Fármacos Analgésicos', 'Medicamentos para el dolor'),
('Insumos Quirúrgicos', 'Material estéril para pabellón'),
('Insumos Generales', 'Jeringas, gasas, guantes');