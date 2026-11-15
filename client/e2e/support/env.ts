import path from 'node:path';

export type Role = 'owner' | 'manager' | 'receptionist';

export const APP_URL = process.env.E2E_APP_URL ?? 'http://app.localhost:3000';
export const APP_ORIGIN = new URL(APP_URL).origin;
export const API_URL = `${APP_ORIGIN}/api/v1`;
export const LANDING_URL = process.env.E2E_LANDING_URL ?? 'http://localhost:3000/landing';
export const AUTH_DIR = path.resolve(__dirname, '..', '.auth');
export const TOKENS_FILE = path.join(AUTH_DIR, 'tokens.json');

export const ACCOUNTS: Record<Role, { phone: string; password: string } | null> = {
  owner: readAccount('E2E_OWNER_PHONE', 'E2E_OWNER_PASSWORD'),
  manager: readAccount('E2E_MANAGER_PHONE', 'E2E_MANAGER_PASSWORD'),
  receptionist: readAccount('E2E_RECEPTIONIST_PHONE', 'E2E_RECEPTIONIST_PASSWORD'),
};

export function hasCredentials(role: Role): boolean {
  return ACCOUNTS[role] !== null;
}

export function authFile(role: Role): string {
  return path.join(AUTH_DIR, `${role}.json`);
}

function readAccount(phoneKey: string, passwordKey: string) {
  const phone = process.env[phoneKey];
  const password = process.env[passwordKey];
  return phone && password ? { phone, password } : null;
}
