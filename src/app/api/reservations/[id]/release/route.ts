import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const reservations = await tx.$queryRaw<
        { id: string; status: string; quantity: number; productId: string; warehouseId: string }[]
      >`
        SELECT id, status, quantity, "productId", "warehouseId"
        FROM "Reservation"
        WHERE id = ${params.id}
        FOR UPDATE
      `;

      const reservation = reservations[0];

      if (!reservation) {
        throw new Error("NOT_FOUND");
      }

      if (reservation.status !== "PENDING") {
        throw new Error("NOT_PENDING");
      }

      // Restore reserved units
      await tx.stock.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: { reserved: { decrement: reservation.quantity } },
      });

      return tx.reservation.update({
        where: { id: params.id },
        data: { status: "RELEASED" },
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
    if (message === "NOT_PENDING") {
      return NextResponse.json(
        { error: "Only PENDING reservations can be released." },
        { status: 409 }
      );
    }

    console.error("Release error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
