import { createHash, randomBytes } from 'crypto';

export const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createVerificationToken() {
  const token = randomBytes(32).toString('hex');
  return {
    token,
    hash: hashToken(token),
    expiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS),
  };
}