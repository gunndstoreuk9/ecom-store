"use client";

import { X, MessageCircle } from "lucide-react";
import { HERO_OFFERS } from "@/config/offers";
import { HERO_PRODUCT } from "@/config/products";
import { BRAND } from "@/config/brand";
import { formatMad } from "@/lib/currency";
import { useCartStore } from "./CartProvider";
import { CheckoutPopup } from "./CheckoutPopup";

export function CartDrawer() {
  const { drawerOpen, closeDrawer, selectedOffer, setOffer, openCheckout, checkoutOpen } = useCartStore();

  return (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="سلة التسوق"
        className={`fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-[#102033]">سلتك</h2>
          <button
            onClick={closeDrawer}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="إغلاق السلة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Trust line */}
        <div className="bg-[#EEF5FF] px-4 py-2 text-xs text-[#1E4A8C] font-medium text-center">
          الدفع عند الاستلام · لا تحتاج بطاقة بنكية
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Product */}
          <div className="flex gap-4 items-start">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 text-3xl">
              💊
            </div>
            <div>
              <p className="font-semibold text-sm text-[#102033] leading-snug">{HERO_PRODUCT.nameAr}</p>
              <p className="text-xs text-[#667085] mt-1">{selectedOffer.qty} × {formatMad(selectedOffer.priceMad / selectedOffer.qty)}</p>
              <p className="text-[#DC2626] font-bold mt-1">{formatMad(selectedOffer.priceMad)}</p>
            </div>
          </div>

          {/* Offer selector */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#102033]">اختر العرض:</p>
            <div className="grid gap-2">
              {HERO_OFFERS.map((offer) => (
                <button
                  key={offer.id}
                  onClick={() => setOffer(offer.id)}
                  className={`w-full flex items-center justify-between rounded-xl border-2 px-4 py-3 transition-colors text-sm ${
                    selectedOffer.id === offer.id
                      ? "border-[#1E4A8C] bg-[#EEF5FF]"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-right">
                    <span className="font-semibold text-[#102033]">{offer.label}</span>
                    {offer.badge && (
                      <span className="block text-xs text-[#D4A017] font-medium mt-0.5">{offer.badge}</span>
                    )}
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-[#DC2626]">{formatMad(offer.priceMad)}</span>
                    {offer.savings && <span className="block text-xs text-[#16A34A]">{offer.savings}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Scarcity */}
          <div className="bg-[#FFF7ED] border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800">
            ⚡ العرض متوفر اليوم فقط للطلبات المؤكدة.
          </div>

          {/* Summary */}
          <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-[#667085]">
              <span>المجموع الجزئي</span>
              <span>{formatMad(selectedOffer.priceMad)}</span>
            </div>
            <div className="flex justify-between text-[#16A34A] font-medium">
              <span>التوصيل</span>
              <span>مجاني</span>
            </div>
            <div className="flex justify-between font-bold text-base text-[#102033] border-t border-gray-100 pt-2 mt-2">
              <span>الإجمالي (عند الاستلام)</span>
              <span>{formatMad(selectedOffer.priceMad)}</span>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-4 border-t border-gray-200 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button onClick={openCheckout} className="btn-red w-full">
            أكمل الطلب
          </button>
          <a
            href={`https://wa.me/${BRAND.whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full border border-[#16A34A] text-[#16A34A] hover:bg-green-50 transition-colors text-sm font-medium"
          >
            <MessageCircle className="w-4 h-4" />
            <span>تواصل على واتساب</span>
          </a>
        </div>
      </div>

      {checkoutOpen && <CheckoutPopup />}
    </>
  );
}
