// Simple session helper using signed cookies (HMAC-like)
// POC only - not production-grade auth
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { User } from "@/lib/types";

const SESSION_COOKIE = "lms_its_session";
const SESSION_SECRET = "perkeso-lms-its-poc-secret-2026";

// Lightweight session token: base64(userId|expiresAt|signature)
// signature = simple XOR hash of (userId|expiresAt) with secret - POC only
function simpleHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return (h >>> 0).toString(36);
}

function sign(payload: string): string {
  return simpleHash(payload + "|" + SESSION_SECRET);
}

export function createSessionToken(userId: string, days = 7): string {
  const expiresAt = Date.now() + days * 86400000;
  const payload = `${userId}|${expiresAt}`;
  const signature = sign(payload);
  const token = Buffer.from(`${payload}|${signature}`).toString("base64");
  return token;
}

export function verifySessionToken(token: string): { userId: string; expiresAt: number } | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split("|");
    if (parts.length < 3) return null;
    const userId = parts[0];
    const expiresAt = parseInt(parts[1], 10);
    const signature = parts.slice(2).join("|");
    const expectedSig = sign(`${userId}|${expiresAt}`);
    if (signature !== expectedSig) return null;
    if (Date.now() > expiresAt) return null;
    return { userId, expiresAt };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const verified = verifySessionToken(token);
  if (!verified) return null;
  const user = await db.user.findUnique({ where: { id: verified.userId } });
  if (!user || !user.isActive) return null;
  // strip password
  const { password: _pw, ...safeUser } = user;
  return safeUser as unknown as User;
}

export async function setSessionCookie(userId: string) {
  const token = createSessionToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86400000,
  });
  await db.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
