import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/expiry";
import type { ProductWithStock } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  // Lazy expiry cleanup on every product list request
  await releaseExpiredReservations();

  const products = await prisma.product.findMany({
    include: {
      stock: {
        include: {
          warehouse: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const response: ProductWithStock[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    imageUrl: p.imageUrl,
    price: p.price.toString(),
    stock: p.stock.map((s) => ({
      warehouseId: s.warehouseId,
      warehouseName: s.warehouse.name,
      warehouseLocation: s.warehouse.location,
      total: s.total,
      reserved: s.reserved,
      available: s.total - s.reserved,
    })),
  }));

  return NextResponse.json(response);
}
