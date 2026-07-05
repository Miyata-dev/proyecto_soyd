import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
});

// Este interceptor se ejecuta antes de cada petición (GET, POST, etc.)
api.interceptors.request.use((config) => {
    // Leemos los datos guardados en la memoria del navegador
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');

    // Si existen, los inyectamos en los headers
    if (userId) {
        config.headers['x-user-id'] = userId;
    }
    if (userRole) {
        config.headers['x-user-role'] = userRole;
    }

    return config;
});

export default api;