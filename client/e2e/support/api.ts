import { request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { API_URL, type Role } from './env';
import { getToken } from './tokens';

export type ApiClient = {
  request: APIRequestContext;
  get<T>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<T>;
  post<T>(path: string, data?: unknown): Promise<T>;
  put<T>(path: string, data?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
  dispose(): Promise<void>;
};

type ApiEnvelope<T> = { data: T; message?: string; code?: number };

function endpoint(path: string): string {
  return path.replace(/^\/+/, '');
}

export async function createApi(role: Role): Promise<ApiClient> {
  const { accessToken } = getToken(role);
  const request = await playwrightRequest.newContext({
    baseURL: `${API_URL}/`,
    extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
  });

  async function unwrap<T>(response: Awaited<ReturnType<APIRequestContext['get']>>, label: string): Promise<T> {
    if (!response.ok()) {
      throw new Error(`[e2e] ${label} thất bại (${response.status()}): ${await response.text()}`);
    }
    const body = (await response.json()) as ApiEnvelope<T>;
    return body.data;
  }

  return {
    request,
    async get<T>(path: string, query?: Record<string, string | number | boolean | undefined>) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query ?? {})) {
        if (value !== undefined) params.set(key, String(value));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : '';
      return unwrap<T>(await request.get(endpoint(path) + suffix), `GET ${path}`);
    },
    async post<T>(path: string, data?: unknown) {
      return unwrap<T>(await request.post(endpoint(path), { data }), `POST ${path}`);
    },
    async put<T>(path: string, data?: unknown) {
      return unwrap<T>(await request.put(endpoint(path), { data }), `PUT ${path}`);
    },
    async delete<T>(path: string) {
      return unwrap<T>(await request.delete(endpoint(path)), `DELETE ${path}`);
    },
    dispose() {
      return request.dispose();
    },
  };
}
