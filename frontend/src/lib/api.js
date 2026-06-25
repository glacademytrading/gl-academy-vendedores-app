import axios from "axios";
import { demoRequest, isDemoToken } from "@/lib/demoApi";

const runtimeConfig = window.GL_MODEL_ACADEMY_CONFIG || {};
const BACKEND_URL = runtimeConfig.BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const API_BASE = `${BACKEND_URL}/api`;
const TOKEN_KEY = "gl_sales_training_token";
const ENABLE_DEMO_FALLBACK =
  runtimeConfig.ENABLE_DEMO_FALLBACK === true || process.env.REACT_APP_ENABLE_DEMO_FALLBACK === "true";

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
}

export function isDemoSession() {
  return ENABLE_DEMO_FALLBACK && isDemoToken(getStoredToken());
}

const http = axios.create({
  baseURL: API_BASE,
});

// Attach Authorization header from localStorage on each request
http.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function shouldUseDemo(err) {
  if (!ENABLE_DEMO_FALLBACK) return false;
  const status = err?.response?.status;
  return !status || status === 404 || status >= 500;
}

async function request(method, url, payload, config) {
  const token = getStoredToken();
  if (ENABLE_DEMO_FALLBACK && isDemoToken(token)) return demoRequest(method, url, payload, config);
  try {
    if (method === "get" || method === "delete") return await http[method](url, config);
    return await http[method](url, payload, config);
  } catch (err) {
    if (!shouldUseDemo(err)) throw err;
    return demoRequest(method, url, payload, config);
  }
}

const api = {
  get: (url, config) => request("get", url, null, config),
  post: (url, payload, config) => request("post", url, payload, config),
  patch: (url, payload, config) => request("patch", url, payload, config),
  delete: (url, config) => request("delete", url, null, config),
  interceptors: http.interceptors,
};

// Format FastAPI/validation error details into a string
export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (detail == null) {
    if (!err?.response && (err?.message || "").toLowerCase().includes("network")) {
      return "Nao foi possivel conectar ao servidor. Verifique a internet ou avise o suporte da GL Academy.";
    }
    return err?.message || "Erro inesperado.";
  }
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export { API_BASE, BACKEND_URL };
export default api;
