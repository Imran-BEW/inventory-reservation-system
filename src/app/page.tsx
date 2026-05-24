import { ProductGrid } from "@/components/ProductGrid";
import type { ProductWithStock } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function getProducts(): Promise<ProductWithStock[]> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${base}/api/products`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export default async function HomePage() {
  const products = await getProducts();

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-12">
        <div className="text-xs text-[#e8ff47] font-dm-sans tracking-widest uppercase mb-3">
          Live Inventory
        </div>
        <h1 className="font-syne font-bold text-4xl md:text-5xl text-white mb-3 leading-tight">
          All Products
        </h1>
        <p className="text-white/40 font-dm-sans text-base max-w-xl">
          Stock levels update in real time. Reserve a product to hold it for 10 minutes while you complete payment.
        </p>
      </div>

      <ProductGrid products={products} />
    </div>
  );
}
