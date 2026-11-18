const API_BASE =
  typeof window !== 'undefined'
    ? '/backend-api'
    : (process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:4000');

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('brewlite_jwt_token');
}

export function setStoredToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('brewlite_jwt_token', token);
    sessionStorage.removeItem('brewlite_barista_token');
    sessionStorage.removeItem('brewlite_barista_user');
    window.dispatchEvent(new Event('brewlite-auth-changed'));
  }
}

export function removeStoredToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('brewlite_jwt_token');
    localStorage.removeItem('brewlite_user');
    sessionStorage.removeItem('brewlite_barista_token');
    sessionStorage.removeItem('brewlite_barista_user');
    window.dispatchEvent(new Event('brewlite-auth-changed'));
  }
}

export function getStoredUser(): any | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('brewlite_user');
  try {
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('brewlite_user', JSON.stringify(user));
    window.dispatchEvent(new Event('brewlite-auth-changed'));
  }
}

export function getBaristaToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('brewlite_barista_token');
}

export function setBaristaToken(token: string) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('brewlite_barista_token', token);
  }
}

export function getBaristaUser(): any | null {
  if (typeof window === 'undefined') return null;
  const user = sessionStorage.getItem('brewlite_barista_user');
  return user ? JSON.parse(user) : null;
}

export function setBaristaUser(user: any) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('brewlite_barista_user', JSON.stringify(user));
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

  if (!headers['Authorization'] && token) {
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
