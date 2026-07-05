import { useEffect, useState, useMemo } from 'react';
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
    const [busqueda, setBusqueda] = useState('');
    const [seleccion, setSeleccion] = useState(null);
    const [cantidad, setCantidad] = useState(1);
    const [mensaje, setMensaje] = useState(null);
    const [enviando, setEnviando] = useState(false);

    const cargarInventario = () => {
        api.get('/bodega/inventario')
            .then(response => {
                setInventario(response.data.data);
                setEstado(response.data.modo);
            })
            .catch(error => {
                console.error("Error conectando a bodega:", error);
                setEstado('Error al conectar con la bodega');
            });
    };

    useEffect(() => { cargarInventario(); }, []);

    const inventarioFiltrado = useMemo(() => {
        const term = busqueda.trim().toLowerCase();
        if (!term) return inventario;
        return inventario.filter(item =>
            limpiarTexto(item.nombre_producto).toLowerCase().includes(term) ||
            item.codigo_producto.toLowerCase().includes(term) ||
            limpiarTexto(item.categoria).toLowerCase().includes(term)
        );
    }, [inventario, busqueda]);

    const abrirDespacho = (item) => {
        setSeleccion(item);
        setCantidad(1);
    };

    const confirmarDespacho = async (e) => {
        e.preventDefault();
        if (!seleccion) return;
        setEnviando(true);
        setMensaje(null);
        try {
            const solicitanteId = localStorage.getItem('userId');
            const res = await api.post('/bodega/despachar', {
                codigo_producto: seleccion.codigo_producto,
                cantidad: Number(cantidad),
                personal_solicitante_id: solicitanteId,
            });
            setMensaje({ tipo: 'exito', texto: res.data.mensaje || 'Despacho realizado con éxito.' });
            setSeleccion(null);
            cargarInventario();
        } catch (error) {
            const texto = error.response?.data?.error || error.response?.data?.alerta || 'Error al despachar el insumo.';
            setMensaje({ tipo: 'error', texto });
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="section-container">
            <div className="card">
                <h2>Sistema de Bodega e Inventario</h2>
                <p>Estado del servicio: <strong>{estado}</strong></p>
            </div>

            {mensaje && (
                <div className={`alert ${mensaje.tipo === 'exito' ? 'alert-success' : 'alert-error'}`}>
                    {mensaje.texto}
                </div>
            )}

            <input
                type="text"
                className="input-search"
                placeholder="Buscar por nombre, código o categoría..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
            />

            <table>
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th>Stock Actual</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
                    {inventarioFiltrado.map(item => {
                        const critico = item.cantidad_stock <= item.stock_critico;
                        return (
                            <tr key={item.id}>
                                <td>{item.codigo_producto}</td>
                                <td>{limpiarTexto(item.nombre_producto)}</td>
                                <td>{limpiarTexto(item.categoria)}</td>
                                <td>
                                    <span className={`badge ${critico ? 'badge-danger' : 'badge-ok'}`}>
                                        {item.cantidad_stock} {item.unidad_medida}
                                    </span>
                                </td>
                                <td>
                                    <button className="btn-small" onClick={() => abrirDespacho(item)}>Despachar</button>
                                </td>
                            </tr>
                        );
                    })}
                    {inventarioFiltrado.length === 0 && (
                        <tr><td colSpan="5">No se encontraron productos.</td></tr>
                    )}
                </tbody>
            </table>

            {seleccion && (
                <div className="modal-overlay" onClick={() => setSeleccion(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Despachar: {limpiarTexto(seleccion.nombre_producto)}</h3>
                        <p className="muted">Stock disponible: {seleccion.cantidad_stock} {seleccion.unidad_medida}</p>
                        <form onSubmit={confirmarDespacho}>
                            <label>Cantidad a despachar</label>
                            <input
                                type="number"
                                min="1"
                                max={seleccion.cantidad_stock}
                                value={cantidad}
                                onChange={(e) => setCantidad(e.target.value)}
                                required
                            />
                            <div className="modal-actions">
                                <button type="button" className="btn-ghost" onClick={() => setSeleccion(null)}>Cancelar</button>
                                <button type="submit" disabled={enviando}>{enviando ? 'Despachando...' : 'Confirmar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}