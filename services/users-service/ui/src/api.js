import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL?.trim();

if (!baseURL) {
  throw new Error(
    "VITE_API_URL est requise : copiez .env.example vers .env dans services/users-service/ui, puis relancez Vite."
  );
}

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
