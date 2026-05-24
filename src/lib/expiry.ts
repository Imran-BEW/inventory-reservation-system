import { prisma } from "./prisma";

/**
 * Releases all expired PENDING reservations and returns their stock.
 * Called lazily on reads and also by the cron job.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const now = new Date();

  // Find all expired pending reservations
  const expired = await prisma.reservation.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: now },
    },
  });

  if (expired.length === 0) return 0;

  // Release each one inside a transaction to restore stock
  let released = 0;
  for (const reservation of expired) {
    try {
      await prisma.$transaction(async (tx) => {
        // Update reservation status
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: "RELEASED" },
        });

        // Restore reserved units to stock
        await tx.stock.update({
          where: {
            productId_warehouseId: {
              productId: reservation.productId,
              warehouseId: reservation.warehouseId,
            },
          },
          data: {
            reserved: { decrement: reservation.quantity },
          },
        });
      });
      released++;
    } catch (e) {
      // Skip if this reservation was already handled by a concurrent process
      console.warn(`Failed to release reservation ${reservation.id}:`, e);
    }
  }

  return released;
}
