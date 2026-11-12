export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'CLIENT';
  companyId: string | null;
  csrf: string;
}
export interface Company {
  id: string;
  name: string;
  _count: { branches: number };
}
export interface Branch {
  id: string;
  name: string;
  address: string;
  companyId: string;
  company: { name: string };
}
export interface Summary {
  views: number;
  websiteClicks: number;
  calls: number;
  routes: number;
  averageRating: number | null;
  reviewsCount: number;
}
export interface Point {
  date: string;
  views: number;
  websiteClicks: number;
  calls: number;
  routes: number;
}
let csrf = '';
export function setCsrf(value: string) {
  csrf = value;
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch('/api' + path, {
    credentials: 'include',
    method: body === undefined ? 'GET' : 'POST',
    headers:
      body === undefined
        ? {}
        : { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const error = (await response
      .json()
      .catch(() => ({ message: 'Сервис временно недоступен' }))) as {
      message?: string | string[];
    };
    if (response.status === 401 && !path.startsWith('/auth/')) {
      window.location.assign('/login');
    }
    throw new Error(
      Array.isArray(error.message)
        ? error.message.join('. ')
        : (error.message ?? 'Не удалось выполнить запрос'),
    );
  }
  return response.json() as Promise<T>;
}
