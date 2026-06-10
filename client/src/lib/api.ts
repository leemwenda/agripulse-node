import axios from 'axios';
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/verify', '/'];

api.interceptors.response.use(
  res => res,
  err => {
    const onPublicPage = PUBLIC_PATHS.some(p => window.location.pathname.startsWith(p));
    if (err.response?.status === 401 && !onPublicPage) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
export default api;
