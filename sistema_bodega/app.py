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
    MODO TOLERANCIA A FALLOS (ACTIVO-PASIVO):
    Intenta leer siempre del Master para evitar desincronización (Split-Brain).
    Si el Master cae, el except atrapa el error y conmuta automáticamente a la Réplica.
    """
    modo_actual = "NORMAL_MASTER"
    try:
        conn = get_db_master()
    except Error as e_master:
        logger.warning(f"Master caído ({e_master}). Conmutando a Réplica...")
        try:
            conn = get_db_replica()
            modo_actual = "DEGRADADO_REPLICA"
        except Error as e_replica:
            logger.error("Fallo crítico: Master y Réplica caídos.")
            return jsonify({"error": "Servicio de inventario temporalmente inaccesible"}), 500

    try:
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
        return jsonify({"modo": modo_actual, "total": len(productos), "data": productos}), 200
    except Error as e:
        return jsonify({"error": "Error al ejecutar la consulta de inventario"}), 500

@app.route('/api/bodega/despachar', methods=['POST'])
def despachar_insumo():
    """
    MODO FAILOVER ACTIVO:
    Intenta escribir en el Master. Si falla, conmuta y escribe en la Réplica.
    """
    data = request.json
    codigo = data.get('codigo_producto')
    cantidad = data.get('cantidad', 1)
    solicitante_id = data.get('personal_solicitante_id', None)
    observaciones = data.get('observaciones', 'Despacho clínico regular')

    if not codigo:
        return jsonify({"error": "Debe especificar el codigo_producto"}), 400

    modo_usado = "MASTER"
    try:
        conn = get_db_master()
    except Error as e_master:
        logger.warning(f"Master caído en escritura ({e_master}). Failover a Réplica...")
        try:
            conn = get_db_replica()
            modo_usado = "REPLICA_PROMOVIDA"
        except Error as e_replica:
            logger.critical("Fallo total: Ni Master ni Réplica están disponibles.")
            return jsonify({"error": "Base de datos totalmente inaccesible"}), 500

    try:
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

        # 2. Descontar del inventario 
        nuevo_stock = item['cantidad_stock'] - cantidad
        cursor.execute("UPDATE inventario SET cantidad_stock = %s WHERE id = %s", (nuevo_stock, item['id']))
        
        # 3. Registrar el historial 
        query_mov = """
            INSERT INTO movimientos_bodega (inventario_id, tipo_movimiento, cantidad, personal_solicitante_id, observaciones)
            VALUES (%s, 'EGRESO', %s, %s, %s)
        """
        cursor.execute(query_mov, (item['id'], cantidad, solicitante_id, f"{observaciones} (Ejecutado en {modo_usado})"))
        
        # Confirmamos cambios
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"Despacho exitoso en modo {modo_usado}: {cantidad} unidades de {codigo}.")
        return jsonify({
            "mensaje": f"Despacho realizado con éxito (Modo: {modo_usado})",
            "codigo_producto": codigo,
            "stock_restante": nuevo_stock
        }), 200

    except Error as e:
        if 'conn' in locals() and conn.is_connected():
            conn.rollback()
            conn.close()
        return jsonify({"error": f"Error procesando el despacho: {str(e)}"}), 500

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