import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withIdempotency } from "@/lib/idempotency";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withIdempotency(req, `POST:/api/reservations/${params.id}/confirm`, async () => {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Lock the reservation row to prevent double-confirms
        const reservations = await tx.$queryRaw<
          { id: string; status: string; expiresAt: Date; quantity: number; productId: string; warehouseId: string }[]
        >`
          SELECT id, status, "expiresAt", quantity, "productId", "warehouseId"
          FROM "Reservation"
          WHERE id = ${params.id}
          FOR UPDATE
        `;

        const reservation = reservations[0];

        if (!reservation) {
          throw new Error("NOT_FOUND");
        }

        if (reservation.status === "CONFIRMED") {
          throw new Error("ALREADY_CONFIRMED");
        }

        if (reservation.status === "RELEASED") {
          throw new Error("ALREADY_RELEASED");
        }

        if (new Date(reservation.expiresAt) < new Date()) {
          // Expired — release the stock and mark as released
          await tx.stock.update({
            where: {
              productId_warehouseId: {
                productId: reservation.productId,
                warehouseId: reservation.warehouseId,
              },
            },
            data: { reserved: { decrement: reservation.quantity } },
          });

          await tx.reservation.update({
            where: { id: params.id },
            data: { status: "RELEASED" },
          });

          throw new Error("EXPIRED");
        }

        // Confirm: decrement total stock and reserved count
        await tx.stock.update({
          where: {
            productId_warehouseId: {
              productId: reservation.productId,
              warehouseId: reservation.warehouseId,
            },
          },
          data: {
            total: { decrement: reservation.quantity },
            reserved: { decrement: reservation.quantity },
          },
        });

        return tx.reservation.update({
          where: { id: params.id },
          data: { status: "CONFIRMED" },
          include: { product: true, warehouse: true },
        });
      });

      return NextResponse.json({
        id: result.id,
        status: result.status,
        productId: result.productId,
        warehouseId: result.warehouseId,
        quantity: result.quantity,
        expiresAt: result.expiresAt.toISOString(),
        createdAt: result.createdAt.toISOString(),
        product: {
          id: result.product.id,
          name: result.product.name,
          price: result.product.price.toString(),
          imageUrl: result.product.imageUrl,
        },
        warehouse: {
          id: result.warehouse.id,
          name: result.warehouse.name,
          location: result.warehouse.location,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";

      if (message === "NOT_FOUND") {
        return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
      }
      if (message === "EXPIRED") {
        return NextResponse.json(
          { error: "This reservation has expired. The units have been released back to stock." },
          { status: 410 }
        );
      }
      if (message === "ALREADY_CONFIRMED") {
        return NextResponse.json({ error: "Reservation is already confirmed." }, { status: 409 });
      }
      if (message === "ALREADY_RELEASED") {
        return NextResponse.json({ error: "Reservation was released and cannot be confirmed." }, { status: 409 });
      }

      console.error("Confirm error:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}
