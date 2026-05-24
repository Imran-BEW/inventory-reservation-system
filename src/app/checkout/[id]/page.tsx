import { notFound } from "next/navigation";
import { CheckoutClient } from "@/components/CheckoutClient";
import type { ReservationResponse } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function getReservation(id: string): Promise<ReservationResponse | null> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${base}/api/reservations/${id}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch reservation");
  return res.json();
}

export default async function CheckoutPage({
  params,
}: {
  params: { id: string };
}) {
  const reservation = await getReservation(params.id);
  if (!reservation) notFound();

  return <CheckoutClient initialReservation={reservation} />;
}
