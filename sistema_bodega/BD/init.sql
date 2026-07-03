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
  personal_solicitante_id CHAR(36), -- Referencia a la App 2
  fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  observaciones TEXT,
  FOREIGN KEY (inventario_id) REFERENCES inventario(id)
);

INSERT INTO categorias_insumos (nombre, descripcion) VALUES 
('Fármacos Analgésicos', 'Medicamentos para el dolor'),
('Insumos Quirúrgicos', 'Material estéril para pabellón'),
('Insumos Generales', 'Jeringas, gasas, guantes');

-- Insertar productos de prueba
INSERT INTO inventario (categoria_id, codigo_producto, nombre_producto, cantidad_stock, stock_critico, unidad_medida) VALUES 
(1, 'FAR-001', 'Paracetamol 500mg (Caja x20)', 150, 20, 'Cajas'),
(1, 'FAR-002', 'Amoxicilina 500mg (Caja x10)', 80, 15, 'Cajas'),
(1, 'FAR-003', 'Adrenalina 1mg/ml (Ampolla)', 45, 10, 'Ampollas'),
(2, 'QUI-001', 'Jeringa Desechable 5ml c/aguja', 500, 100, 'Unidades'),
(2, 'QUI-002', 'Bisturí Desechable N°15', 200, 30, 'Unidades'),
(3, 'GEN-001', 'Guantes de Látex Estériles (Par)', 350, 50, 'Pares'),
(3, 'GEN-002', 'Gasa Estéril 10x10cm (Sobre)', 600, 100, 'Sobres');