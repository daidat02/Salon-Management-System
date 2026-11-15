import fs from 'node:fs';
import { TOKENS_FILE, authFile, type Role } from './env';

type TokenEntry = {
  accessToken: string;
  user: Record<string, unknown>;
};

let cache: Partial<Record<Role, TokenEntry>> | null = null;

function loadTokens(): Partial<Record<Role, TokenEntry>> {
  if (cache) return cache;
  if (!fs.existsSync(TOKENS_FILE)) return (cache = {});
  cache = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8')) as Partial<Record<Role, TokenEntry>>;
  return cache;
}

export function getToken(role: Role): TokenEntry {
  const token = loadTokens()[role];
  if (!token) {
    throw new Error(
      `[e2e] Chưa có phiên đăng nhập cho "${role}". ` +
        `Kiểm tra E2E_${role.toUpperCase()}_PHONE / E2E_${role.toUpperCase()}_PASSWORD.`,
    );
  }
  return token;
}

export function hasRole(role: Role): boolean {
  return !!loadTokens()[role];
}

export function storageStateFor(role: Role): string {
  if (!hasRole(role)) {
    throw new Error(`[e2e] Chưa có storageState cho "${role}" (${authFile(role)}).`);
  }
  return authFile(role);
}
