import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 10000, // 10 segundos
});

// Interceptor para logs (request)
api.interceptors.request.use(
  (config) => {
    console.log("🚀 API Request:", {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      data: config.data,
    });
    return config;
  },
  (error) => {
    console.error("❌ API Request Error:", error);
    return Promise.reject(error);
  }
);

// Interceptor para logs (response)
api.interceptors.response.use(
  (response) => {
    console.log("✅ API Response:", {
      status: response.status,
      url: response.config.url,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error("❌ API Response Error:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      data: error.response?.data,
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
