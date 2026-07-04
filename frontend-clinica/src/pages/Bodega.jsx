import { useEffect, useState } from 'react';
import api from '../api/axiosConfig';

export default function Bodega() {
    const [inventario, setInventario] = useState([]);
    const [estado, setEstado] = useState('Cargando...');

    useEffect(() => {
        // Hacemos un GET al Gateway, el cual enrutará al puerto 5000 (Python)
        api.get('/bodega/inventario')
            .then(response => {
                setInventario(response.data.data);
                setEstado(response.data.modo); // Muestra si está en LECTURA_ACTIVA o MODO_DEGRADADO
            })
            .catch(error => {
                console.error(error);
                setEstado('Error al conectar con la bodega');
            });
    }, []);

    return (
        <div style={{ padding: '20px' }}>
            <h2>📦 Sistema de Bodega e Inventario</h2>
            <p>Estado del servicio: <strong>{estado}</strong></p>
            
            <table border="1" cellPadding="10">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th>Stock Actual</th>
                    </tr>
                </thead>
                <tbody>
                    {inventario.map(item => (
                        <tr key={item.id}>
                            <td>{item.codigo_producto}</td>
                            <td>{item.nombre_producto}</td>
                            <td>{item.categoria}</td>
                            <td>{item.cantidad_stock} {item.unidad_medida}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}