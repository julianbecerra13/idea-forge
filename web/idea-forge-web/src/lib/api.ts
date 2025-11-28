import axios from "axios";
import Cookies from "js-cookie";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 35000, // 35 segundos (5s más que backend para evitar timeouts prematuros)
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

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
    // No loguear errores 404 esperados (arquitecturas que no existen aún)
    const is404 = error.response?.status === 404;
    const isArchitectureEndpoint = error.config?.url?.includes('/architecture/');

    // Solo loguear errores que no sean 404 en endpoints de arquitectura
    if (!(is404 && isArchitectureEndpoint)) {
      // Loguear solo metadata del error, no datos sensibles
      console.error("❌ API Error:", {
        status: error.response?.status,
        url: error.config?.url,
        message: error.message,
      });
    }

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

export const deleteIdea = (id: string) =>
  api.delete(`/ideation/ideas/${id}`);

// Action Plan API
export const createActionPlan = (ideaId: string) =>
  api.post(`/action-plan`, { idea_id: ideaId }).then((r) => r.data);

export const getActionPlan = (id: string) =>
  api.get(`/action-plan/${id}`).then((r) => r.data);

export const getActionPlanByIdeaId = (ideaId: string) =>
  api.get(`/action-plan/by-idea/${ideaId}`).then((r) => r.data);

export const updateActionPlan = (id: string, payload: {
  status?: string;
  functional_requirements?: string;
  non_functional_requirements?: string;
  business_logic_flow?: string;
  completed?: boolean;
}) => api.put(`/action-plan/${id}`, payload).then((r) => r.data);

export const getActionPlanMessages = (id: string) =>
  api.get(`/action-plan/${id}/messages`).then((r) => r.data);

export const postActionPlanChat = (actionPlanId: string, message: string) =>
  api.post(`/action-plan/agent/chat`, { action_plan_id: actionPlanId, message }).then((r) => r.data);

// Architecture API
export const createArchitecture = (actionPlanId: string) =>
  api.post(`/architecture`, { action_plan_id: actionPlanId }).then((r) => r.data);

export const getArchitecture = (id: string) =>
  api.get(`/architecture/${id}`).then((r) => r.data);

export const getArchitectureByActionPlanId = (actionPlanId: string) =>
  api.get(`/architecture/by-action-plan/${actionPlanId}`).then((r) => r.data);

export const updateArchitecture = (id: string, payload: {
  status?: string;
  user_stories?: string;
  database_type?: string;
  database_schema?: string;
  entities_relationships?: string;
  tech_stack?: string;
  architecture_pattern?: string;
  system_architecture?: string;
  completed?: boolean;
}) => api.put(`/architecture/${id}`, payload).then((r) => r.data);

export const getArchitectureMessages = (id: string) =>
  api.get(`/architecture/${id}/messages`).then((r) => r.data);

export const postArchitectureChat = (architectureId: string, message: string) =>
  api.post(`/architecture/agent/chat`, { architecture_id: architectureId, message }).then((r) => r.data);

// Auth API
export const register = (payload: {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}) => api.post(`/auth/register`, payload).then((r) => r.data);

export const verifyEmail = (payload: {
  user_id: string;
  code: string;
}) => api.post(`/auth/verify-email`, payload).then((r) => r.data);

export const resendCode = (payload: {
  user_id: string;
}) => api.post(`/auth/resend-code`, payload).then((r) => r.data);

export const login = (payload: {
  email_or_username: string;
  password: string;
}) => api.post(`/auth/login`, payload).then((r) => r.data);

export const forgotPassword = (payload: {
  email: string;
}) => api.post(`/auth/forgot-password`, payload).then((r) => r.data);

export const resetPassword = (payload: {
  token: string;
  new_password: string;
  confirm_password: string;
}) => api.post(`/auth/reset-password`, payload).then((r) => r.data);

export const getMe = () => api.get(`/auth/me`).then((r) => r.data);
