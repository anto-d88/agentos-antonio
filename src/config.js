export const API_URL =
  import.meta.env.VITE_AGENTOS_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

export const API_BASE_URL = API_URL;

export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}