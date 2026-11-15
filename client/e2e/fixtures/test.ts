import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import { createApi, type ApiClient } from '../support/api';
import { APP_URL, hasCredentials, type Role } from '../support/env';
import { storageStateFor } from '../support/tokens';

type Fixtures = {
  api: ApiClient;
  apiAs: (role: Role) => Promise<ApiClient>;
  pageAs: (role: Role) => Promise<Page>;
};

export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      const hideDevtools = () => {
        const style = document.createElement('style');
        style.textContent = '.tsqd-parent-container{display:none!important}';
        (document.head || document.documentElement).appendChild(style);
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hideDevtools, { once: true });
      } else {
        hideDevtools();
      }
    });
    await use(page);
  },
  apiAs: async ({}, use) => {
    const clients: ApiClient[] = [];
    await use(async (role) => {
      const client = await createApi(role);
      clients.push(client);
      return client;
    });
    await Promise.all(clients.map((client) => client.dispose()));
  },
  api: async ({ apiAs }, use) => {
    await use(await apiAs('owner'));
  },
  pageAs: async ({ browser }, use) => {
    const contexts: BrowserContext[] = [];
    await use(async (role) => {
      const context = await browser.newContext({
        baseURL: APP_URL,
        storageState: storageStateFor(role),
        locale: 'vi-VN',
        timezoneId: 'Asia/Ho_Chi_Minh',
      });
      contexts.push(context);
      return context.newPage();
    });
    await Promise.all(contexts.map((context) => context.close()));
  },
});

export { expect };

export function roleStorageState(role: Role) {
  if (!hasCredentials(role)) {
    test.skip(true, `Chưa cấu hình tài khoản E2E cho role "${role}"`);
    return { cookies: [], origins: [] };
  }
  return storageStateFor(role);
}
