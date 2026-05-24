import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ReservationResponse } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
    include: { product: true, warehouse: true },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }

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

  return NextResponse.json(response);
}
