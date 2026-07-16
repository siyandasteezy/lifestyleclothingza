import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { prisma } from "@/lib/db";

const SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.adminSession.create({ data: { token, userId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.adminSession.deleteMany({ where: { token } });
  }
  jar.delete(SESSION_COOKIE);
}

/** True when a database is configured (admin, checkout, and forms need it). */
export function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Returns the logged-in admin or null. Cached per request; never throws. */
export const getAdmin = cache(async () => {
  if (!dbConfigured()) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const session = await prisma.adminSession.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.adminSession.delete({ where: { id: session.id } });
      return null;
    }
    return session.user;
  } catch {
    // Database unreachable — treat as signed out rather than crashing the page.
    return null;
  }
});

/** Guard for admin pages — redirects to the login screen when signed out. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
