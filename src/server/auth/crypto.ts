import { createHash, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";

const AUTH_SECRET = process.env.AUTH_SECRET ?? "dev-secret";
const PASSWORD_MIN = Number(process.env.PASSWORD_MIN_LENGTH ?? 10);

export type PasswordStrength = {
  score: number; // 0-4
  valid: boolean;
  feedback: string[];
};

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= PASSWORD_MIN) score += 1;
  else feedback.push(`At least ${PASSWORD_MIN} characters required`);

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  else feedback.push("Include both upper and lower case letters");

  if (/\d/.test(password)) score += 1;
  else feedback.push("Include at least one number");

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push("Include at least one special character");

  return {
    score,
    valid: score >= 3 && password.length >= PASSWORD_MIN,
    feedback,
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function integrityHash(payload: Record<string, unknown>) {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return createHash("sha256")
    .update(canonical + AUTH_SECRET)
    .digest("hex");
}

export function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function sessionMaxAgeMs() {
  const hours = Number(process.env.SESSION_MAX_AGE_HOURS ?? 8);
  return hours * 60 * 60 * 1000;
}

export function lockoutConfig() {
  return {
    maxFailed: Number(process.env.MAX_FAILED_LOGINS ?? 5),
    lockoutMinutes: Number(process.env.LOCKOUT_MINUTES ?? 30),
  };
}

export const SESSION_COOKIE = "psm_session";
