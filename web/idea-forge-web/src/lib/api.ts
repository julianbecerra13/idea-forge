import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 35000, // 35 segundos (5s más que backend para evitar timeouts prematuros)
});

// Interceptor para logs (request)
api.interceptors.request.use(
  (config) => {
    // Solo loguear en desarrollo para evitar exponer datos en producción
    if (process.env.NODE_ENV === 'development') {
      console.log("🚀 API Request:", {
        method: config.method?.toUpperCase(),
        url: config.url,
      });
    }
    return config;
  },
  (error) => {
    console.error("❌ API Request Error:", error.message);
    return Promise.reject(error);
  }
);

// Interceptor para logs (response)
api.interceptors.response.use(
  (response) => {
    // Solo loguear en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log("✅ API Response:", {
        status: response.status,
        url: response.config.url,
      });
    }
    return response;
  },
  (error) => {
    // Loguear solo metadata del error, no datos sensibles
    console.error("❌ API Error:", {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

export const getIdea = (id: string) =>
  api.get(`/ideation/ideas/${id}`).then((r) => r.data);

export const listIdeas = () =>
  api.get(`/ideation/ideas`).then((r) => r.data);

export const getMessages = (id: string) =>
  api.get(`/ideation/ideas/${id}/messages`).then((r) => r.data);

export const postChat = (ideaId: string, message: string) =>
  api.post(`/ideation/agent/chat`, { idea_id: ideaId, message }).then((r) => r.data);

export const createIdea = (payload: {
  title: string;
  objective: string;
  problem: string;
  scope: string;
  validate_competition?: boolean;
  validate_monetization?: boolean;
}) => api.post(`/ideation/ideas`, payload).then((r) => r.data);

export const updateIdea = (id: string, payload: {
  title?: string;
  objective?: string;
  problem?: string;
  scope?: string;
  validate_competition?: boolean;
  validate_monetization?: boolean;
  completed?: boolean;
}) => api.put(`/ideation/ideas/${id}`, payload).then((r) => r.data);
