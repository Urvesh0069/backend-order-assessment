import axios, { AxiosError } from 'axios';
import type {
  AuthResponse,
  Order,
  UploadResult,
  CustomerOrdersResponse,
  OrdersListResponse,
} from './types';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export const api = axios.create({ baseURL });

const TOKEN_KEY = 'orders_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function toErrorMessage(err: unknown): string {
  const ax = err as AxiosError<{ error?: unknown }>;
  if (ax?.response) {
    const data = ax.response.data;
    const raw = data?.error;
    if (typeof raw === 'string') return raw;
    if (raw && typeof raw === 'object') {
      const flat = raw as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
      const parts: string[] = [];
      if (flat.formErrors?.length) parts.push(...flat.formErrors);
      if (flat.fieldErrors) {
        for (const [field, msgs] of Object.entries(flat.fieldErrors)) {
          if (msgs?.length) parts.push(`${field}: ${msgs.join(', ')}`);
        }
      }
      if (parts.length) return parts.join(' · ');
    }
    return `Request failed (${ax.response.status})`;
  }
  if (ax?.request) return 'Cannot reach the server. Is the backend running on port 4000?';
  return 'Something went wrong. Please try again.';
}

export async function signup(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/signup', { email, password });
  return data;
}
export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
  return data;
}

export async function uploadOrders(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<UploadResult>('/orders/upload-orders', form, {
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return data;
}

export async function getAllOrders(limit = 100): Promise<OrdersListResponse> {
  const { data } = await api.get<OrdersListResponse>('/orders', { params: { limit } });
  return data;
}

export async function getOrderById(orderId: string): Promise<Order> {
  const { data } = await api.get<Order>(`/orders/${encodeURIComponent(orderId)}`);
  return data;
}

export async function getOrdersByCustomer(customerId: string): Promise<CustomerOrdersResponse> {
  const { data } = await api.get<CustomerOrdersResponse>('/orders', {
    params: { customerId },
  });
  return data;
}
