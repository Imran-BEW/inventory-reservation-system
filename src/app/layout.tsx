import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Allo Inventory",
  description: "Multi-warehouse inventory and reservation platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      <body className="bg-[#0a0a0a] text-[#f0ede6] min-h-screen antialiased">
        <header className="border-b border-white/10 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <a href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 bg-[#e8ff47] rounded-sm flex items-center justify-center">
                <span className="text-black font-syne font-black text-sm">A</span>
              </div>
              <span className="font-syne font-semibold text-lg tracking-tight">
                Allo <span className="text-white/40 font-light">/ inventory</span>
              </span>
            </a>
            <div className="text-xs text-white/30 font-dm-sans tracking-widest uppercase">
              Multi-warehouse fulfillment
            </div>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
