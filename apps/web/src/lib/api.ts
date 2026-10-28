const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('brewlite_jwt_token');
}

export function setStoredToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('brewlite_jwt_token', token);
  }
}

export function removeStoredToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('brewlite_jwt_token');
    localStorage.removeItem('brewlite_user');
  }
}

export function getStoredUser(): any | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('brewlite_user');
  return user ? JSON.parse(user) : null;
}

export function setStoredUser(user: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('brewlite_user', JSON.stringify(user));
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  idempotencyKey?: string,
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.message || `Lỗi yêu cầu máy chủ (Mã HTTP: ${res.status})`;
    const error = new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg) as any;
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data as T;
}
