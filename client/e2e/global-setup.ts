import fs from 'node:fs/promises';
import { request as playwrightRequest, type APIRequestContext, type FullConfig } from '@playwright/test';
import { ACCOUNTS, API_URL, APP_ORIGIN, AUTH_DIR, TOKENS_FILE, authFile, type Role } from './support/env';

type StorageState = Awaited<ReturnType<APIRequestContext['storageState']>>;

type TokenEntry = {
  accessToken: string;
  user: Record<string, unknown>;
};

async function login(role: Role, phone: string, password: string): Promise<{ state: StorageState; token: TokenEntry }> {
  const context = await playwrightRequest.newContext({ baseURL: APP_ORIGIN });
  try {
    const response = await context.post(API_URL + '/login', { data: { phone, password } });
    if (!response.ok()) {
      throw new Error(
        `[e2e] Đăng nhập ${role} thất bại (${response.status()}): ${await response.text()}`,
      );
    }

    const body = (await response.json()) as {
      data?: { access_token?: string; user?: Record<string, unknown> };
    };
    const accessToken = body.data?.access_token;
    const user = body.data?.user;
    if (!accessToken || !user) {
      throw new Error(`[e2e] Phản hồi login ${role} thiếu access_token/user: ${JSON.stringify(body)}`);
    }

    const state = await context.storageState();
    state.origins = [
      {
        origin: APP_ORIGIN,
        localStorage: [
          {
            name: 'persist:auth',
            value: JSON.stringify({
              user: JSON.stringify(user),
              _persist: JSON.stringify({ version: -1, rehydrated: true }),
            }),
          },
        ],
      },
    ];

    return { state, token: { accessToken, user } };
  } finally {
    await context.dispose();
  }
}

export default async function globalSetup(_config: FullConfig) {
  await fs.mkdir(AUTH_DIR, { recursive: true });

  const tokens: Partial<Record<Role, TokenEntry>> = {};
  const missing: Role[] = [];

  for (const [role, account] of Object.entries(ACCOUNTS) as [Role, { phone: string; password: string } | null][]) {
    if (!account) {
      missing.push(role);
      continue;
    }

    const { state, token } = await login(role, account.phone, account.password);
    await fs.writeFile(authFile(role), JSON.stringify(state, null, 2));
    tokens[role] = token;
  }

  await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2));

  if (missing.length > 0) {
    console.warn(
      `[e2e] Thiếu tài khoản cho role: ${missing.join(', ')}. ` +
        'Đặt E2E_<ROLE>_PHONE / E2E_<ROLE>_PASSWORD để chạy test cần đăng nhập (xem e2e/README.md).',
    );
  }
}
