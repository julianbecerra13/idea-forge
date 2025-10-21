import Cookies from 'js-cookie';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface User {
  id: string;
  username: string;
  email: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function setAuthToken(token: string): void {
  Cookies.set(TOKEN_KEY, token, { expires: 7 }); // 7 días
}

export function getAuthToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

export function removeAuthToken(): void {
  Cookies.remove(TOKEN_KEY);
  Cookies.remove(USER_KEY);
}

export function setUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export function logout(): void {
  removeAuthToken();
  window.location.href = '/auth/login';
}
