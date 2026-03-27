import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Show loading bar
  if (typeof document !== 'undefined') {
      const bar = document.getElementById('loading-bar');
      if (bar) {
          bar.style.width = '30%';
          bar.style.opacity = '1';
      }
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (typeof document !== 'undefined') {
        const bar = document.getElementById('loading-bar');
        if (bar) {
            bar.style.width = '100%';
            setTimeout(() => {
                bar.style.opacity = '0';
                setTimeout(() => bar.style.width = '0', 300);
            }, 500);
        }
    }
    return response;
  },
  (error) => {
    if (typeof document !== 'undefined') {
        const bar = document.getElementById('loading-bar');
        if (bar) {
            bar.style.width = '100%';
            bar.style.backgroundColor = '#ef4444'; // Red on error
            setTimeout(() => {
                bar.style.opacity = '0';
                setTimeout(() => {
                    bar.style.width = '0';
                    bar.style.backgroundColor = '#2563eb'; // Reset to blue
                }, 300);
            }, 500);
        }
    }
    return Promise.reject(error);
  }
);

export default api;
