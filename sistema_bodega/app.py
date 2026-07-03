import os
import logging
from flask import Flask, request, jsonify
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("SistemaBodega")

# Configuración de Base de Datos 
DB_USER = os.getenv('DB_USER', 'admin')
DB_PASS = os.getenv('DB_PASSWORD', 'secretpassword')
DB_NAME = os.getenv('DB_NAME', 'bodega_db')

# Nombres de los servicios en Docker
MASTER_HOST = os.getenv('DB_MASTER_HOST', 'bodega_mysql_master')
REPLICA_HOST = os.getenv('DB_REPLICA_HOST', 'bodega_mysql_replica')

def get_db_replica():
    """Conecta a la RÉPLICA para operaciones de lectura"""
    try:
        return mysql.connector.connect(
            host=REPLICA_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME, connection_timeout=3
        )
    except Error as e:
        logger.warning(f"Réplica inaccesible ({e}). Usando Master como respaldo para lectura...")
        return mysql.connector.connect(
            host=MASTER_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME, connection_timeout=3
        )

def get_db_master():
    """Conecta al MASTER exclusivamente para operaciones de escritura (Despachos/Ingresos)."""
    return mysql.connector.connect(
        host=MASTER_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME, connection_timeout=3
    )

@app.route('/api/bodega/inventario', methods=['GET'])
def obtener_inventario():
    """
    MODO LECTURA: Lee desde la Réplica. 
    Hacemos un JOIN con categorias_insumos para que el frontend vea el nombre de la categoría.
    """
    try:
        conn = get_db_replica()
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT i.id, i.codigo_producto, i.nombre_producto, i.cantidad_stock, 
                   i.stock_critico, i.unidad_medida, c.nombre AS categoria
            FROM inventario i
            JOIN categorias_insumos c ON i.categoria_id = c.id
            ORDER BY i.nombre_producto ASC
        """
        cursor.execute(query)
        productos = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify({"modo": "LECTURA_ACTIVA", "total": len(productos), "data": productos}), 200
    except Error as e:
        logger.error(f"Fallo crítico: No se pudo leer ni de Réplica ni de Master: {e}")
        return jsonify({"error": "Servicio de inventario temporalmente inaccesible"}), 500

@app.route('/api/bodega/despachar', methods=['POST'])
def despachar_insumo():
    """
    MODO ESCRITURA: Requiere el Master.
    Si el Master cae -> Captura el error y activa el MODO DEGRADADO.
    """
    data = request.json
    codigo = data.get('codigo_producto')
    cantidad = data.get('cantidad', 1)
    solicitante_id = data.get('personal_solicitante_id', None)
    observaciones = data.get('observaciones', 'Despacho clínico regular')

    if not codigo:
        return jsonify({"error": "Debe especificar el codigo_producto"}), 400

    try:
        conn = get_db_master()
        conn.autocommit = False 
        cursor = conn.cursor(dictionary=True)
        
        # 1. Verificar stock actual del insumo
        cursor.execute("SELECT id, cantidad_stock, nombre_producto FROM inventario WHERE codigo_producto = %s FOR UPDATE", (codigo,))
        item = cursor.fetchone()
        
        if not item:
            conn.rollback()
            return jsonify({"error": "Producto no encontrado en bodega"}), 404
            
        if item['cantidad_stock'] < cantidad:
            conn.rollback()
            return jsonify({"error": f"Stock insuficiente para {item['nombre_producto']}. Stock actual: {item['cantidad_stock']}"}), 400

        # 2. Descontar del inventario principal
        nuevo_stock = item['cantidad_stock'] - cantidad
        cursor.execute("UPDATE inventario SET cantidad_stock = %s WHERE id = %s", (nuevo_stock, item['id']))
        
        # 3. Registrar el historial en movimientos_bodega (Auditoría)
        query_mov = """
            INSERT INTO movimientos_bodega (inventario_id, tipo_movimiento, cantidad, personal_solicitante_id, observaciones)
            VALUES (%s, 'EGRESO', %s, %s, %s)
        """
        cursor.execute(query_mov, (item['id'], cantidad, solicitante_id, observaciones))
        
        # Confirmamos ambos cambios al mismo tiempo
        conn.commit()
        
        cursor.close()
        conn.close()
        
        logger.info(f"Despacho exitoso: {cantidad} unidades de {codigo} para solicitante {solicitante_id}.")
        return jsonify({
            "mensaje": "Despacho realizado y registrado en auditoría con éxito",
            "codigo_producto": codigo,
            "stock_restante": nuevo_stock
        }), 200

    except Error as e:
        # Toleracnia a fallas: Si el Master cae, activamos MODO DEGRADADO.
        logger.critical(f" [ALERTA DE CAÍDA] Falló el Master MySQL: {e}. Activando Modo Degradado.")
        return jsonify({
            "status": "MODO_DEGRADADO",
            "alerta": "Servidor principal de base de datos fuera de línea (Failover en proceso).",
            "detalle_tecnico": "Se han suspendido las escrituras y despachos para evitar inconsistencias.",
            "accion_requerida": "El stock se puede seguir consultando en modo lectura a través de /api/bodega/inventario."
        }), 503

@app.route('/api/bodega/status', methods=['GET'])
def status_check():
    """Monitoreo para el Orquestador y el Middleware."""
    master_ok, replica_ok = False, False
    try:
        conn = get_db_master(); conn.close(); master_ok = True
    except: pass
    try:
        conn = get_db_replica(); conn.close(); replica_ok = True
    except: pass

    status_code = 200 if (master_ok or replica_ok) else 503
    return jsonify({
        "modulo": "Aplicación 3 - Sistema de Bodega e Inventario",
        "db_master_status": "ONLINE" if master_ok else "OFFLINE",
        "db_replica_status": "ONLINE" if replica_ok else "OFFLINE",
        "modo_operativo": "NORMAL (Lectura/Escritura)" if master_ok else ("DEGRADADO (Solo Lectura)" if replica_ok else "CAÍDO")
    }), status_code

if __name__ == '__main__':
    logger.info("Iniciando Módulo de Bodega Clínica (Puerto 5000)...")
    app.run(host='0.0.0.0', port=5000)