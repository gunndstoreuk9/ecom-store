"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";

const NAV_LINKS = [
  { href: "/", label: "الرئيسية" },
  { href: "/collections", label: "العروض" },
  { href: "/about", label: "من نحن" },
  { href: "/contact", label: "تواصل معنا" },
];

const PRODUCT_LINKS = [
  { href: "/products/balance", label: "المركّب الأمريكي لضبط السكر" },
  { href: "/products/miracle-men-oil", label: "الزيت المعجزة للرجال" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] shadow-sm">
      <div className="container-main">
        <div className="flex items-center justify-between h-16">
          {/* Logo on right (RTL) */}
          <Logo />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <div className="group relative">
              <Link
                href="/collections"
                className="text-[#102033] hover:text-[#1E4A8C] font-medium transition-colors text-sm"
              >
                منتجاتنا
              </Link>
              <div className="invisible absolute right-0 top-full z-50 w-64 translate-y-2 rounded-2xl border border-gray-100 bg-white p-2 opacity-0 shadow-xl transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                {PRODUCT_LINKS.map((product) => (
                  <Link
                    key={product.href}
                    href={product.href}
                    className="block rounded-xl px-4 py-3 text-sm font-bold text-[#102033] transition hover:bg-[#EEF5FF] hover:text-[#1E4A8C]"
                  >
                    {product.label}
                  </Link>
                ))}
              </div>
            </div>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[#102033] hover:text-[#1E4A8C] font-medium transition-colors text-sm"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA + mobile toggle on left */}
          <div className="flex items-center gap-3">
            <Link
              href="/products/balance#cod-order"
              className="hidden sm:inline-flex rounded-full bg-[#DC2626] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700"
            >
              اطلب الآن
            </Link>

            <button
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="القائمة"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#E5E7EB] bg-white">
          <nav className="container-main py-4 flex flex-col gap-3">
            <div className="rounded-2xl bg-[#F8FAFC] p-3">
              <Link
                href="/collections"
                className="mb-2 block text-[#102033] font-black"
                onClick={() => setMobileOpen(false)}
              >
                منتجاتنا
              </Link>
              <div className="grid gap-2">
                {PRODUCT_LINKS.map((product) => (
                  <Link
                    key={product.href}
                    href={product.href}
                    className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-[#1E4A8C]"
                    onClick={() => setMobileOpen(false)}
                  >
                    {product.label}
                  </Link>
                ))}
              </div>
            </div>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[#102033] hover:text-[#1E4A8C] font-medium py-2 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
