import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReserveSchema } from "@/lib/schemas";
import { withIdempotency } from "@/lib/idempotency";
import type { ReservationResponse } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const RESERVATION_WINDOW_MINUTES = 10;

export async function POST(req: NextRequest) {
  return withIdempotency(req, "POST:/api/reservations", async () => {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = ReserveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, warehouseId, quantity } = parsed.data;

    try {
      const reservation = await prisma.$transaction(async (tx) => {
        // ── CRITICAL: SELECT FOR UPDATE ───────────────────────────────────────
        // This acquires a row-level lock on the stock row for the duration of
        // this transaction. Any concurrent request for the same
        // (productId, warehouseId) pair will block here until we commit or
        // rollback — guaranteeing exactly-once decrement even under high load.
        const stocks = await tx.$queryRaw<
          { id: string; total: number; reserved: number }[]
        >`
          SELECT id, total, reserved
          FROM "Stock"
          WHERE "productId" = ${productId}
            AND "warehouseId" = ${warehouseId}
          FOR UPDATE
        `;

        const stock = stocks[0];

        if (!stock) {
          throw new Error("STOCK_NOT_FOUND");
        }

        const available = stock.total - stock.reserved;
        if (available < quantity) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        // Increment the reserved count
        await tx.stock.update({
          where: {
            productId_warehouseId: { productId, warehouseId },
          },
          data: {
            reserved: { increment: quantity },
          },
        });

        const expiresAt = new Date(
          Date.now() + RESERVATION_WINDOW_MINUTES * 60 * 1000
        );

        return tx.reservation.create({
          data: {
            productId,
            warehouseId,
            quantity,
            status: "PENDING",
            expiresAt,
          },
          include: {
            product: true,
            warehouse: true,
          },
        });
      });

      const response: ReservationResponse = {
        id: reservation.id,
        productId: reservation.productId,
        warehouseId: reservation.warehouseId,
        quantity: reservation.quantity,
        status: reservation.status,
        expiresAt: reservation.expiresAt.toISOString(),
        createdAt: reservation.createdAt.toISOString(),
        product: {
          id: reservation.product.id,
          name: reservation.product.name,
          price: reservation.product.price.toString(),
          imageUrl: reservation.product.imageUrl,
        },
        warehouse: {
          id: reservation.warehouse.id,
          name: reservation.warehouse.name,
          location: reservation.warehouse.location,
        },
      };

      return NextResponse.json(response, { status: 201 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";

      if (message === "INSUFFICIENT_STOCK") {
        return NextResponse.json(
          { error: "Not enough stock available for this product/warehouse combination." },
          { status: 409 }
        );
      }

      if (message === "STOCK_NOT_FOUND") {
        return NextResponse.json(
          { error: "No stock record found for this product/warehouse combination." },
          { status: 404 }
        );
      }

      console.error("Reservation error:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}
