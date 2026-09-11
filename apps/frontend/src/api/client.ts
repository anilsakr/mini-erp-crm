import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'mini-erp-crm.token';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api',
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// The backend's error envelope is always { success:false, message, error:{code, details} }.
// Normalizing to a plain Error with that message means every screen can just
// render `error.message` without knowing about axios/response shapes.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    const message = error.response?.data?.message ?? error.message ?? 'Something went wrong';
    const details = error.response?.data?.error?.details;
    return Promise.reject(Object.assign(new Error(message), { details, status: error.response?.status }));
  },
);
