import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Prisma errors that mean "the database wasn't reachable *this instant*"
 * rather than "your query is wrong":
 *   P1001 can't reach database server · P1002 connection timed out
 *   P1008 operation timed out         · P1017 server closed the connection
 *
 * Serverless Postgres (Neon) suspends its compute when idle, so the first
 * query after a quiet spell — during a build that prerenders every page, or
 * from a real visitor — can land mid cold-start and fail. These are worth
 * retrying; a validation error never is.
 */
const TRANSIENT_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);

function isTransient(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_CODES.has(error.code);
  }
  // Thrown before a request code is assigned (e.g. pool/connect failures)
  return error instanceof Prisma.PrismaClientInitializationError;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs a database read, retrying transient connection failures with
 * exponential backoff (~0.5s, 1s, 2s, 4s). Non-connection errors rethrow
 * immediately so genuine bugs still surface loudly.
 */
export async function withRetry<T>(operation: () => Promise<T>, attempts = 5): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransient(error)) throw error;
      lastError = error;
      if (attempt < attempts - 1) await sleep(500 * 2 ** attempt);
    }
  }
  throw lastError;
}
