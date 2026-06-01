// Vite использует import.meta.env для инъекции переменных окружения при сборке
const API_URL = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Кеширование токена в памяти (в замыкании)
let cachedToken: string | null = null;

export function setAuthToken(token: string) {
  cachedToken = token;
  localStorage.setItem('token', token);
}

export function clearAuthToken() {
  cachedToken = null;
  localStorage.removeItem('token');
}

function getHeaders(authRequired = true): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (authRequired) {
    const token = cachedToken || localStorage.getItem('token');
    if (token) {
      cachedToken = token; // Обновляем кеш в памяти для следующих запросов
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

/**
 * Centralized fetch wrapper to handle timeouts, network failures, 
 * and invalid JSON responses gracefully.
 */
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}, timeoutMs = 10000): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      signal: controller.signal
    });

    let data: Record<string, unknown>;
    try {
      data = await res.json();
    } catch (_e) {
      throw new ApiError('Invalid response from server.', res.status);
    }

    if (!res.ok) {
      const errorMessage = typeof data.error === 'string' ? data.error : `Server error: ${res.status}`;
      throw new ApiError(errorMessage, res.status);
    }

    return data as T;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timed out', 408);
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}

export interface UserProfile {
  id: string;
  email: string;
  reservations?: (Reservation & { product: Product })[];
}

export interface User {
  id: string;
  email: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  badge: string;
  category: string;
  specs: string[];
}

export interface Reservation {
  id: string;
  expiresAt: string;
  quantity: number;
}

export const api = {
  // Auth API
  async register(email: string, password: string): Promise<{ token: string; user: User }> {
    return apiFetch('/auth/register', {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ email, password })
    });
  },

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    return apiFetch('/auth/login', {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ email, password })
    });
  },

  async getMe(): Promise<User> {
    return apiFetch('/auth/me', {
      method: 'GET',
      headers: getHeaders(true)
    });
  },

  // Products API
  async getProducts(): Promise<Product[]> {
    const res = await apiFetch<{ data: Product[] }>('/products', {
      method: 'GET',
      headers: getHeaders(false)
    });
    return res.data;
  },

  async getProduct(id: string): Promise<Product> {
    return apiFetch(`/products/${id}`, {
      method: 'GET',
      headers: getHeaders(false)
    });
  },

  // Checkout API
  async reserve(userId: string, productId: string, quantity: number, customIdempotencyKey?: string): Promise<Reservation> {
    // Клиент обязан сам генерировать idempotencyKey для каждого нового бизнес-намерения
    const idempotencyKey = customIdempotencyKey || crypto.randomUUID(); 
    
    const data = await apiFetch<{ message: string; reservations: Reservation[] }>('/checkout/reserve', {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ userId, productId, quantity, idempotencyKey })
    });
    return data.reservations[0]; // Assuming it returns an array but we need one
  },

  async confirmCheckout(reservationId: string): Promise<{ success: boolean }> {
    return apiFetch('/checkout', {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ reservationId })
    });
  },

  async pollReservationStatus(id: string): Promise<{ status: string; reservation?: Reservation; error?: string }> {
    return apiFetch(`/checkout/status/${id}`, {
      method: 'GET',
      headers: getHeaders(true)
    });
  }
};
