import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';

export default function Dashboard() {
    const nombreActual = localStorage.getItem('userName') || 'Usuario Desconocido';
    const rolActual = localStorage.getItem('userRole') || 'SIN ROL';

    const [stats, setStats] = useState({
        bodega: { estado: 'cargando' },
        fichas: { estado: 'cargando' },
        tickets: { estado: 'cargando' },
    });

    useEffect(() => {
        // Cada tarjeta obtiene datos reales de su propio microservicio.
        // Si un servicio falla o el rol no tiene acceso, se degrada sin romper el panel.
        api.get('/bodega/inventario')
            .then(res => {
                const data = res.data.data || [];
                const criticos = data.filter(i => i.cantidad_stock <= i.stock_critico).length;
                setStats(s => ({ ...s, bodega: { estado: 'ok', total: data.length, criticos } }));
            })
            .catch(() => setStats(s => ({ ...s, bodega: { estado: 'error' } })));

        api.get('/fichas')
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : [];
                setStats(s => ({ ...s, fichas: { estado: 'ok', total: data.length } }));
            })
            .catch(() => setStats(s => ({ ...s, fichas: { estado: 'sin_acceso' } })));

        api.get('/tickets')
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : [];
                const enEspera = data.filter(t => t.estado === 'EN_ESPERA').length;
                setStats(s => ({ ...s, tickets: { estado: 'ok', total: data.length, enEspera } }));
            })
            .catch(() => setStats(s => ({ ...s, tickets: { estado: 'error' } })));
    }, []);

    const modulos = [
        {
            to: '/fichas',
            titulo: 'Fichas Clínicas',
            desc: 'Historial y atenciones de pacientes',
            restringido: rolActual === 'ADMINISTRATIVO',
            stat:
                stats.fichas.estado === 'ok'
                    ? `${stats.fichas.total} fichas registradas`
                    : stats.fichas.estado === 'sin_acceso'
                        ? 'Acceso restringido a tu rol'
                        : 'Cargando...',
        },
        {
            to: '/tickets',
            titulo: 'Llamado de Pacientes',
            desc: 'Sala de espera y turnos en vivo',
            stat: stats.tickets.estado === 'ok' ? `${stats.tickets.enEspera} en espera` : 'Cargando...',
        },
        {
            to: '/bodega',
            titulo: 'Bodega e Inventario',
            desc: 'Stock de insumos y fármacos',
            stat:
                stats.bodega.estado === 'ok'
                    ? `${stats.bodega.criticos} producto(s) en stock crítico`
                    : 'Cargando...',
            alerta: stats.bodega.estado === 'ok' && stats.bodega.criticos > 0,
        },
    ];

    return (
        <div className="section-container">
            <div className="hero">
                <h1>Panel Central del Centro de Salud</h1>
                <p>
                    Bienvenido/a, <strong>{nombreActual}</strong> · <span className="role-pill">{rolActual}</span>
                </p>
            </div>

            <div className="modules-grid">
                {modulos.map((m) => {
                    const Wrapper = m.restringido ? 'div' : Link;
                    const wrapperProps = m.restringido ? {} : { to: m.to };
                    return (
                        <Wrapper
                            key={m.to}
                            className={`module-card${m.restringido ? ' module-card-disabled' : ''}`}
                            {...wrapperProps}
                        >
                            <h3>{m.titulo}</h3>
                            <p className="module-desc">{m.desc}</p>
                            <span className={`module-stat${m.alerta ? ' alerta' : ''}`}>{m.stat}</span>
                            {m.restringido && <span className="module-lock">🔒 Requiere rol médico</span>}
                        </Wrapper>
                    );
                })}
            </div>
        </div>
    );
}