"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ReservationResponse } from "@/lib/schemas";
import {
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Package,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShoppingBag,
} from "lucide-react";

interface Props {
  initialReservation: ReservationResponse;
}

type UIState = "pending" | "confirmed" | "released" | "expired";

export function CheckoutClient({ initialReservation }: Props) {
  const router = useRouter();
  const [reservation, setReservation] =
    useState<ReservationResponse>(initialReservation);
  const [uiState, setUiState] = useState<UIState>(
    initialReservation.status === "PENDING"
      ? "pending"
      : initialReservation.status === "CONFIRMED"
      ? "confirmed"
      : "released"
  );
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState<"confirm" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Countdown timer
  useEffect(() => {
    if (uiState !== "pending") return;

    const tick = () => {
      const ms = new Date(reservation.expiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setSecondsLeft(0);
        setUiState("expired");
        return;
      }
      setSecondsLeft(Math.ceil(ms / 1000));
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [reservation.expiresAt, uiState]);

  const handleConfirm = useCallback(async () => {
    setLoading("confirm");
    setError(null);

    try {
      const res = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.status === 410) {
        setError(data.error || "This reservation has expired.");
        setUiState("expired");
        return;
      }

      if (!res.ok) {
        setError(data.error || "Failed to confirm reservation.");
        return;
      }

      setReservation(data);
      setUiState("confirmed");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }, [reservation.id]);

  const handleCancel = useCallback(async () => {
    setLoading("cancel");
    setError(null);

    try {
      const res = await fetch(`/api/reservations/${reservation.id}/release`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to cancel reservation.");
        return;
      }

      setReservation(data);
      setUiState("released");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }, [reservation.id]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isExpiringSoon = secondsLeft > 0 && secondsLeft <= 60;
  const progressPct = Math.min(
    100,
    (secondsLeft / (10 * 60)) * 100
  );

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* Back link */}
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-2 text-white/30 hover:text-white/60 text-sm font-dm-sans mb-8 transition-colors group"
      >
        <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to products
      </button>

      {/* Status Banner */}
      {uiState === "confirmed" && (
        <div className="mb-6 flex items-center gap-3 bg-[#e8ff47]/10 border border-[#e8ff47]/30 rounded-2xl px-5 py-4 animate-slide-up">
          <CheckCircle2 size={22} className="text-[#e8ff47] shrink-0" />
          <div>
            <div className="font-syne font-semibold text-[#e8ff47]">Order confirmed!</div>
            <div className="text-xs text-white/50 font-dm-sans mt-0.5">
              Your purchase is complete. Check your email for order details.
            </div>
          </div>
        </div>
      )}

      {uiState === "released" && (
        <div className="mb-6 flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 animate-slide-up">
          <XCircle size={22} className="text-white/40 shrink-0" />
          <div>
            <div className="font-syne font-semibold text-white/70">Reservation cancelled</div>
            <div className="text-xs text-white/30 font-dm-sans mt-0.5">
              The units have been released back to inventory.
            </div>
          </div>
        </div>
      )}

      {uiState === "expired" && (
        <div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 animate-slide-up">
          <Clock size={22} className="text-red-400 shrink-0" />
          <div>
            <div className="font-syne font-semibold text-red-400">Reservation expired</div>
            <div className="text-xs text-white/40 font-dm-sans mt-0.5">
              The 10-minute window passed. Units have been returned to stock.
            </div>
          </div>
        </div>
      )}

      {/* Main card */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden">
        {/* Product info */}
        <div className="p-6 border-b border-white/8">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-[#1c1c1c] overflow-hidden shrink-0">
              {reservation.product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={reservation.product.imageUrl}
                  alt={reservation.product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package size={24} className="text-white/20" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/30 uppercase tracking-widest font-dm-sans mb-1">
                Reservation #{reservation.id.slice(-8).toUpperCase()}
              </div>
              <h1 className="font-syne font-bold text-xl text-white leading-tight">
                {reservation.product.name}
              </h1>
              <div className="flex items-center gap-1.5 mt-1.5">
                <MapPin size={12} className="text-white/30" />
                <span className="text-white/40 text-xs font-dm-sans">
                  {reservation.warehouse.name} · {reservation.warehouse.location}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Order details */}
        <div className="p-6 border-b border-white/8">
          <div className="grid grid-cols-3 gap-4">
            <DetailCell
              label="Quantity"
              value={String(reservation.quantity)}
            />
            <DetailCell
              label="Unit price"
              value={`₹${Number(reservation.product.price).toLocaleString("en-IN")}`}
            />
            <DetailCell
              label="Total"
              value={`₹${(
                Number(reservation.product.price) * reservation.quantity
              ).toLocaleString("en-IN")}`}
              highlight
            />
          </div>
        </div>

        {/* Timer (only for pending) */}
        {uiState === "pending" && (
          <div className="p-6 border-b border-white/8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock
                  size={14}
                  className={isExpiringSoon ? "text-red-400" : "text-white/40"}
                />
                <span className="text-xs text-white/40 font-dm-sans uppercase tracking-wider">
                  Time remaining
                </span>
              </div>
              <div
                className={`font-syne font-bold text-2xl tabular-nums ${
                  isExpiringSoon ? "text-red-400" : "text-white"
                }`}
              >
                {String(minutes).padStart(2, "0")}:
                {String(seconds).padStart(2, "0")}
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isExpiringSoon ? "bg-red-500" : "bg-[#e8ff47]"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {isExpiringSoon && (
              <p className="text-xs text-red-400 font-dm-sans mt-2">
                ⚠ Hurry! Your reservation expires soon.
              </p>
            )}
          </div>
        )}

        {/* Status pill for non-pending states */}
        {uiState !== "pending" && (
          <div className="px-6 py-4 border-b border-white/8">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/30 font-dm-sans uppercase tracking-wider">Status</span>
              <StatusPill status={uiState} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-6 py-4 border-b border-white/8">
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-400 font-dm-sans">{error}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-6">
          {uiState === "pending" && (
            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                disabled={!!loading}
                className="flex-1 bg-[#e8ff47] text-black font-syne font-bold py-3.5 rounded-xl hover:bg-[#d4eb30] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading === "confirm" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <ShoppingBag size={16} />
                    Confirm purchase
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={!!loading}
                className="px-5 py-3.5 rounded-xl border border-white/10 text-white/50 font-dm-sans font-medium hover:border-white/20 hover:text-white/70 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading === "cancel" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Cancel"
                )}
              </button>
            </div>
          )}

          {(uiState === "released" || uiState === "expired") && (
            <button
              onClick={() => router.push("/")}
              className="w-full bg-white/5 text-white/70 font-syne font-semibold py-3.5 rounded-xl hover:bg-white/10 hover:text-white transition-all border border-white/10"
            >
              Browse products
            </button>
          )}

          {uiState === "confirmed" && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-[#e8ff47] font-syne font-semibold text-lg">
                <CheckCircle2 size={20} />
                Purchase complete
              </div>
              <p className="text-white/30 text-sm font-dm-sans mt-1">
                Thank you for your order.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-white/30 uppercase tracking-wider font-dm-sans mb-1">
        {label}
      </div>
      <div
        className={`font-syne font-bold text-lg ${
          highlight ? "text-[#e8ff47]" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: UIState }) {
  const map = {
    pending: { label: "Pending", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    confirmed: { label: "Confirmed", cls: "bg-[#e8ff47]/10 text-[#e8ff47] border-[#e8ff47]/20" },
    released: { label: "Released", cls: "bg-white/5 text-white/40 border-white/10" },
    expired: { label: "Expired", cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  };
  const s = map[status];
  return (
    <span className={`text-xs font-dm-sans font-medium px-2.5 py-1 rounded-full border ${s.cls}`}>
      {s.label}
    </span>
  );
}
