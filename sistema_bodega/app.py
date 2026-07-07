import os
import logging
from flask import Flask, request, jsonify
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("SistemaBodega")

DB_USER = os.getenv('DB_USER', 'admin')
DB_PASS = os.getenv('DB_PASSWORD', 'secretpassword')
DB_NAME = os.getenv('DB_NAME', 'bodega_db')

MASTER_HOST = os.getenv('DB_MASTER_HOST', 'bodega_mysql_master')
REPLICA_HOST = os.getenv('DB_REPLICA_HOST', 'bodega_mysql_replica')

def get_db_connection(host_target):
    """Retorna una conexión limpia al host especificado con un timeout acotado."""
    return mysql.connector.connect(
        host=host_target, user=DB_USER, password=DB_PASS, database=DB_NAME, connection_timeout=2
    )

@app.route('/api/bodega/inventario', methods=['GET'])
def obtener_inventario():
    """
    Muestra el inventario consultando prioritariamente al Master.
    Si el Master no está disponible, conmuta a la Réplica ofreciendo Alta Disponibilidad.
    """
    modo_actual = "NORMAL_MASTER"
    try:
        conn = get_db_connection(MASTER_HOST)
    except Error:
        logger.warning("Master inaccesible para lectura. Conmutando failover a Réplica...")
        try:
            conn = get_db_connection(REPLICA_HOST)
            modo_actual = "DEGRADADO_REPLICA"
        except Error:
            return jsonify({"error": "Almacenamiento de datos completamente inaccesible"}), 500

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
        return jsonify({"error": f"Error en consulta: {str(e)}"}), 500

@app.route('/api/bodega/despachar', methods=['POST'])
def despachar_insumo():
    """
    CRUD SINCRONIZADO A NIVEL DE APLICACIÓN:
    Aplica los cambios en el Master y propaga inmediatamente la actualización a la Réplica
    para mantener la consistencia entre las copias (Página 4 del PDF).
    """
    data = request.json
    codigo = data.get('codigo_producto')
    cantidad = data.get('cantidad', 1)
    solicitante_id = data.get('personal_solicitante_id', None)
    observaciones = data.get('observaciones', 'Despacho clínico regular')

    if not codigo:
        return jsonify({"error": "Debe especificar el codigo_producto"}), 400

    master_conn = None
    replica_conn = None

    try:
        master_conn = get_db_connection(MASTER_HOST)
        master_conn.autocommit = False
    except Error as e:
        logger.critical(f"Master fuera de línea. Bloqueando escritura para evitar divergencia (Split-Brain): {e}")
        return jsonify({
            "status": "BLOQUEADO",
            "error": "Escritura deshabilitada temporalmente por caída del nodo principal."
        }), 503

    try:
        replica_conn = get_db_connection(REPLICA_HOST)
        replica_conn.autocommit = False
    except Error:
        logger.warning("Réplica fuera de línea. La actualización se realizará en modo degradado solo en el Master.")

    try:
        # Validación de Stock e inserción en el Master
        master_cursor = master_conn.cursor(dictionary=True)
        master_cursor.execute("SELECT id, cantidad_stock, nombre_producto FROM inventario WHERE codigo_producto = %s FOR UPDATE", (codigo,))
        item = master_cursor.fetchone()

        if not item:
            master_conn.rollback()
            if replica_conn: replica_conn.rollback()
            return jsonify({"error": "Producto no encontrado en bodega"}), 404

        if item['cantidad_stock'] < cantidad:
            master_conn.rollback()
            if replica_conn: replica_conn.rollback()
            return jsonify({"error": f"Stock insuficiente para {item['nombre_producto']}"}), 400

        nuevo_stock = item['cantidad_stock'] - cantidad

        # 3. Aplicar cambios en el Master
        master_cursor.execute("UPDATE inventario SET cantidad_stock = %s WHERE id = %s", (nuevo_stock, item['id']))
        query_mov = """
            INSERT INTO movimientos_bodega (inventario_id, tipo_movimiento, cantidad, personal_solicitante_id, observaciones)
            VALUES (%s, 'EGRESO', %s, %s, %s)
        """
        master_cursor.execute(query_mov, (item['id'], cantidad, solicitante_id, observaciones))

        # (Actualización Sincrónica)
        if replica_conn:
            try:
                replica_cursor = replica_conn.cursor(dictionary=True)
                # Sincronizamos el stock exacto calculado para asegurar Consistencia Secuencial o Estricta
                replica_cursor.execute("UPDATE inventario SET cantidad_stock = %s WHERE codigo_producto = %s", (nuevo_stock, codigo))
                
                # Sincronizamos el registro de auditoría en la réplica
                replica_cursor.execute("SELECT id FROM inventario WHERE codigo_producto = %s", (codigo,))
                replica_item = replica_cursor.fetchone()
                if replica_item:
                    replica_cursor.execute(query_mov, (replica_item['id'], cantidad, solicitante_id, f"{observaciones} (Sincronizado)"))
                
                replica_conn.commit()
                replica_cursor.close()
                logger.info("Propagación del método de actualización completada con éxito en la Réplica.")
            except Error as e_replica:
                logger.error(f"Fallo al escribir en la Réplica. Abortando transacción sincrónica: {e_replica}")
                replica_conn.rollback()
                # Opcional: puedes decidir si dejas pasar la escritura en el master o tiras error. 
                # Para asegurar consistencia estricta ante fallas de la réplica, lanzamos excepción:
                raise e_replica
        
        # Si todo anduvo bien en los nodos activos, confirmamos la transacción global
        master_conn.commit()
        master_cursor.close()
        
        if master_conn: master_conn.close()
        if replica_conn: replica_conn.close()

        return jsonify({
            "mensaje": "Despacho realizado y sincronizado en los nodos activos con éxito",
            "codigo_producto": codigo,
            "stock_restante": nuevo_stock
        }), 200

    except Exception as e:
        if master_conn: master_conn.rollback()
        if replica_conn: replica_conn.rollback()
        logger.error(f"Transacción abortada debido a error de consistencia: {str(e)}")
        return jsonify({"error": f"Error procesando la transacción distribuida: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)