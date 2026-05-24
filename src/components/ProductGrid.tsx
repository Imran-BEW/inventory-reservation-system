"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductWithStock } from "@/lib/schemas";
import { Package, MapPin, AlertCircle, Loader2, X } from "lucide-react";

interface Props {
  products: ProductWithStock[];
}

interface ReserveState {
  productId: string;
  warehouseId: string;
  quantity: number;
}

export function ProductGrid({ products }: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<{
    product: ProductWithStock;
    warehouseId: string;
  } | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedWarehouse = modal
    ? modal.product.stock.find((s) => s.warehouseId === modal.warehouseId)
    : null;

  async function handleReserve() {
    if (!modal || !selectedWarehouse) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: modal.product.id,
          warehouseId: modal.warehouseId,
          quantity,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setError(data.error || "Not enough stock available.");
        return;
      }

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      // Navigate to checkout page
      router.push(`/checkout/${data.id}`);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  function openModal(product: ProductWithStock, warehouseId: string) {
    setModal({ product, warehouseId });
    setQuantity(1);
    setError(null);
  }

  function closeModal() {
    if (loading) return;
    setModal(null);
    setError(null);
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            index={i}
            onReserve={openModal}
          />
        ))}
      </div>

      {/* Reserve Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div
            className="relative bg-[#141414] border border-white/10 rounded-2xl p-6 w-full max-w-md animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="mb-5">
              <div className="text-xs text-[#e8ff47] font-dm-sans tracking-widest uppercase mb-2">
                Reserve Unit
              </div>
              <h2 className="font-syne font-bold text-xl text-white leading-tight">
                {modal.product.name}
              </h2>
            </div>

            {/* Warehouse selector */}
            <div className="mb-5">
              <label className="block text-xs text-white/40 uppercase tracking-wider font-dm-sans mb-2">
                Warehouse
              </label>
              <div className="space-y-2">
                {modal.product.stock.map((s) => (
                  <button
                    key={s.warehouseId}
                    onClick={() =>
                      setModal((m) =>
                        m ? { ...m, warehouseId: s.warehouseId } : m
                      )
                    }
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      modal.warehouseId === s.warehouseId
                        ? "border-[#e8ff47]/60 bg-[#e8ff47]/5"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-left">
                      <MapPin size={13} className="text-white/40 shrink-0" />
                      <div>
                        <div className="text-sm font-dm-sans font-medium text-white">
                          {s.warehouseName}
                        </div>
                        <div className="text-xs text-white/40">{s.warehouseLocation}</div>
                      </div>
                    </div>
                    <div
                      className={`text-xs font-dm-sans font-medium px-2 py-1 rounded-md ${
                        s.available === 0
                          ? "bg-red-500/10 text-red-400"
                          : s.available <= 3
                          ? "bg-orange-500/10 text-orange-400"
                          : "bg-white/5 text-white/60"
                      }`}
                    >
                      {s.available === 0 ? "Out of stock" : `${s.available} avail.`}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="mb-5">
              <label className="block text-xs text-white/40 uppercase tracking-wider font-dm-sans mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-white/60 hover:border-white/30 hover:text-white transition-all"
                >
                  −
                </button>
                <span className="font-syne font-bold text-xl text-white w-8 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() =>
                    setQuantity((q) =>
                      Math.min(selectedWarehouse?.available || 1, q + 1)
                    )
                  }
                  className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-white/60 hover:border-white/30 hover:text-white transition-all"
                >
                  +
                </button>
                <span className="text-white/30 text-sm font-dm-sans ml-2">
                  ×{" "}
                  ₹
                  {Number(modal.product.price).toLocaleString("en-IN")} ={" "}
                  <span className="text-white font-medium">
                    ₹
                    {(Number(modal.product.price) * quantity).toLocaleString(
                      "en-IN"
                    )}
                  </span>
                </span>
              </div>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-400 font-dm-sans">{error}</p>
              </div>
            )}

            <button
              onClick={handleReserve}
              disabled={
                loading ||
                !selectedWarehouse ||
                selectedWarehouse.available < quantity
              }
              className="w-full bg-[#e8ff47] text-black font-syne font-bold py-3 rounded-xl hover:bg-[#d4eb30] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Reserving...
                </>
              ) : (
                "Reserve for 10 minutes"
              )}
            </button>
            <p className="text-center text-xs text-white/25 font-dm-sans mt-3">
              No payment charged now. You&apos;ll confirm on the next page.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function ProductCard({
  product,
  index,
  onReserve,
}: {
  product: ProductWithStock;
  index: number;
  onReserve: (product: ProductWithStock, warehouseId: string) => void;
}) {
  const totalAvailable = product.stock.reduce((s, x) => s + x.available, 0);
  const bestWarehouse = product.stock
    .filter((s) => s.available > 0)
    .sort((a, b) => b.available - a.available)[0];

  return (
    <div
      className="bg-[#141414] border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-all group"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Image */}
      <div className="relative h-48 bg-[#1c1c1c] overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={40} className="text-white/10" />
          </div>
        )}
        {/* Stock badge */}
        <div
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-dm-sans font-medium ${
            totalAvailable === 0
              ? "bg-red-500/20 text-red-400 border border-red-500/20"
              : totalAvailable <= 5
              ? "bg-orange-500/20 text-orange-400 border border-orange-500/20"
              : "bg-[#e8ff47]/15 text-[#e8ff47] border border-[#e8ff47]/20"
          }`}
        >
          {totalAvailable === 0
            ? "Out of stock"
            : totalAvailable <= 5
            ? `Only ${totalAvailable} left`
            : `${totalAvailable} in stock`}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-syne font-semibold text-base text-white leading-tight mb-1.5">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-white/40 text-xs font-dm-sans leading-relaxed mb-4 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Warehouse stock mini-list */}
        <div className="space-y-1.5 mb-4">
          {product.stock.map((s) => (
            <div key={s.warehouseId} className="flex items-center gap-2 text-xs">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  s.available === 0
                    ? "bg-red-500"
                    : s.available <= 3
                    ? "bg-orange-400"
                    : "bg-[#e8ff47]"
                }`}
              />
              <span className="text-white/40 font-dm-sans">{s.warehouseName}</span>
              <span
                className={`ml-auto font-dm-sans font-medium ${
                  s.available === 0 ? "text-red-400/60" : "text-white/60"
                }`}
              >
                {s.available === 0 ? "—" : s.available}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-white/30 font-dm-sans">Price</div>
            <div className="font-syne font-bold text-lg text-white">
              ₹{Number(product.price).toLocaleString("en-IN")}
            </div>
          </div>

          <button
            onClick={() =>
              bestWarehouse && onReserve(product, bestWarehouse.warehouseId)
            }
            disabled={!bestWarehouse}
            className="bg-[#e8ff47] text-black font-syne font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-[#d4eb30] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Reserve
          </button>
        </div>
      </div>
    </div>
  );
}
