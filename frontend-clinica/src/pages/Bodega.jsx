import { useEffect, useState } from 'react';
import api from '../api/axiosConfig';

// Función para limpiar caracteres corruptos (Mojibake)
const limpiarTexto = (texto) => {
    if (!texto) return "";
    return texto.toString()
                .replace(/Ã©/g, 'é')
                .replace(/Ã¡/g, 'á')
                .replace(/Ã³/g, 'ó')
                .replace(/Ã­/g, 'í')
                .replace(/Ãº/g, 'ú')
                .replace(/Ã±/g, 'ñ')
                .replace(/NÃ\^/g, 'N°')
                .replace(/Ã‰/g, 'É')
                .replace(/Ã/g, 'í')
                .replace(/Â/g, '');
};

export default function Bodega() {
    const [inventario, setInventario] = useState([]);
    const [estado, setEstado] = useState('Cargando...');

    useEffect(() => {
        // Petición al API Gateway
        api.get('/bodega/inventario')
            .then(response => {
                setInventario(response.data.data);
                setEstado(response.data.modo); 
            })
            .catch(error => {
                console.error("Error conectando a bodega:", error);
                setEstado('Error al conectar con la bodega');
            });
    }, []);

    return (
        <div className="section-container">
            <div className="card">
                <h2>Sistema de Bodega e Inventario</h2>
                <p>Estado del servicio: <strong>{estado}</strong></p>
            </div>
            
            <table>
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
                            <td>{limpiarTexto(item.nombre_producto)}</td>
                            <td>{limpiarTexto(item.categoria)}</td>
                            <td>{item.cantidad_stock} {item.unidad_medida}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}