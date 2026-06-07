"use client";

import { useCartStore } from "@/components/cart/CartProvider";

interface MobileStickyCtaProps {
  label?: string;
  targetId?: string;
}

export function MobileStickyCta({ label = "اطلب الآن — الدفع عند الاستلام", targetId }: MobileStickyCtaProps) {
  const { openDrawer } = useCartStore();
  const handleClick = () => {
    if (targetId) {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    openDrawer();
  };

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg">
      <button onClick={handleClick} className="btn-red w-full text-base">
        {label}
      </button>
    </div>
  );
}
