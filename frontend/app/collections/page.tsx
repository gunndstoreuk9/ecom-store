import Link from "next/link";
import type { Metadata } from "next";
import { ProductImageSlot } from "@/components/brand/ProductImageSlot";
import { HERO_OFFERS } from "@/config/offers";
import { formatMad } from "@/lib/currency";

export const metadata: Metadata = {
  title: "منتجات تَوازُن للصحة",
};

export default function CollectionsPage() {
  return (
    <div className="section-padding bg-gradient-to-br from-[#EEF5FF] via-white to-[#F8F5EF]">
      <div className="container-main">
        <div className="text-center mb-12">
          <p className="mb-2 text-sm font-bold text-[#DC2626]">العرض الرسمي</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#102033] mb-3">منتج تَوازُن الرئيسي</h1>
          <p className="text-[#667085] max-w-2xl mx-auto">
            متجر تَوازُن مركز على منتج واحد واضح: المركّب الأمريكي لضبط السكر — الأصلي، مع عروض COD مباشرة.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <ProductImageSlot
            label="صورة المنتج"
            filename="hero-bundle.webp"
            note="صورة الكور الرئيسي مع شارة الدفع عند الاستلام"
            className="shadow-xl"
          />

          <Link
            href="/products/american-sugar-balance-complex"
            className="card-base p-6 md:p-8 hover:shadow-lg transition-shadow group"
          >
            <div className="inline-block bg-[#DC2626] text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
              الأكثر طلباً
            </div>
            <h2 className="font-extrabold text-[#102033] text-2xl md:text-3xl leading-tight mb-2">
              المركّب الأمريكي لضبط السكر — الأصلي
            </h2>
            <p className="text-sm text-[#667085] mb-4 leading-relaxed">
              20 مكوّن نشط لدعم توازن السكر، الطاقة، والتحكم في الرغبة بالحلويات.
            </p>
            <div className="text-yellow-400 text-sm mb-4">★★★★★ <span className="text-[#667085]">4.9 • +3,120 طلب</span></div>
            <div className="space-y-3">
              {HERO_OFFERS.map((offer) => (
                <div key={offer.id} className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3">
                  <div>
                    <p className="font-bold text-[#102033]">{offer.label}</p>
                    <p className="text-xs text-[#667085]">{offer.qty} عبوة</p>
                  </div>
                  <p className="font-extrabold text-[#DC2626]">{formatMad(offer.priceMad)}</p>
                </div>
              ))}
              </div>
            <span className="mt-6 block rounded-full bg-[#DC2626] px-6 py-3 text-center text-sm font-bold text-white group-hover:bg-red-700">
              شاهد العرض وأرسل الطلب
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
