"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";

const NAV_LINKS = [
  { href: "/", label: "الرئيسية" },
  { href: "/products/american-sugar-balance-complex", label: "المنتج" },
  { href: "/collections", label: "العروض" },
  { href: "/about", label: "من نحن" },
  { href: "/contact", label: "تواصل معنا" },
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
              href="/products/american-sugar-balance-complex#cod-order"
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
