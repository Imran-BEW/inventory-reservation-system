import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";

const IDEMPOTENCY_TTL_HOURS = 24;

/**
 * Checks for an existing idempotency record and returns the cached response,
 * or calls the handler and saves the result for future retries.
 */
export async function withIdempotency(
  req: NextRequest,
  endpoint: string,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const idempotencyKey = req.headers.get("Idempotency-Key");

  if (!idempotencyKey) {
    return handler();
  }

  // Check for existing record
  const existing = await prisma.idempotencyRecord.findUnique({
    where: { key: `${endpoint}:${idempotencyKey}` },
  });

  if (existing) {
    if (existing.expiresAt < new Date()) {
      // Expired record — treat as new request
      await prisma.idempotencyRecord.delete({
        where: { id: existing.id },
      });
    } else {
      // Return cached response
      return NextResponse.json(existing.responseBody, {
        status: existing.statusCode,
        headers: { "Idempotency-Key": idempotencyKey, "X-Idempotent-Replayed": "true" },
      });
    }
  }

  // Execute the handler
  const response = await handler();
  const body = await response.clone().json().catch(() => ({}));

  // Save idempotency record (best-effort — don't fail the request if this fails)
  try {
    await prisma.idempotencyRecord.create({
      data: {
        key: `${endpoint}:${idempotencyKey}`,
        endpoint,
        responseBody: body,
        statusCode: response.status,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000),
      },
    });
  } catch (e) {
    // If there's a unique constraint race (two identical keys hitting simultaneously),
    // the second one will fail here — that's fine, the first one wins.
    console.warn("Idempotency record save failed (likely race):", e);
  }

  return response;
}
