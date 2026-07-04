import axios from 'axios';

// Dynamically assign baseURL using Vite's environment variables.
// Fallback to localhost for local development if the env var is missing.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15-second max wait time
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inject JWT Token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mayzax_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle global session expirations safely
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response, config } = error;

    // Do not trigger global logout logic if the request was an authentication attempt
    const isAuthEndpoint = config.url.includes('/auth/login') || config.url.includes('/auth/forgot-password');

    if (response && (response.status === 401 || response.status === 403) && !isAuthEndpoint) {
      // Clear compromised/expired session data
      localStorage.removeItem('mayzax_token');
      localStorage.removeItem('mayzax_user');
      
      // Dispatch a custom event so React (AuthContext) can handle the state update gracefully 
      // without forcing a jarring hard window reload, though href works as a fallback.
      window.dispatchEvent(new Event('mayzax-session-expired'));
      
      // Fallback redirect if React context doesn't catch it
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default client;