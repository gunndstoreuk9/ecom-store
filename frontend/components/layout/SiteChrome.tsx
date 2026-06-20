"use client";

import { usePathname } from "next/navigation";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartProvider } from "@/components/cart/CartProvider";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { TrustStrip } from "@/components/layout/TrustStrip";
import { PixelScripts } from "@/components/tracking/PixelScripts";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isCallCenter = pathname?.startsWith("/call-center");

  if (isAdmin || isCallCenter) {
    return <main>{children}</main>;
  }

  return (
    <CartProvider>
      <PixelScripts />
      <TrustStrip />
      <Header />
      <main>{children}</main>
      <Footer />
      <CartDrawer />
    </CartProvider>
  );
}
