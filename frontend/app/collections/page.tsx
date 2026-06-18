import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
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
          <p className="mb-2 text-sm font-bold text-[#DC2626]">العروض الرسمية</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#102033] mb-3">منتجات تَوازُن المختارة</h1>
          <p className="text-[#667085] max-w-2xl mx-auto">
            عروض COD مباشرة بمنتجات مختارة للسوق المغربي، مع تأكيد بالهاتف والدفع عند الاستلام.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          <Link
            href="/products/balance"
            className="card-base p-6 md:p-8 hover:shadow-lg transition-shadow group"
          >
            <div className="inline-block bg-[#DC2626] text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
              الأكثر طلباً
            </div>
            <h2 className="font-extrabold text-[#102033] text-2xl md:text-3xl leading-tight mb-2">
              المركّب الأمريكي لضبط السكر — الأصلي
            </h2>
            <p className="text-sm text-[#667085] mb-4 leading-relaxed">
              20 مكوّن نشط لتحفيز ودعم وظيفة البنكرياس الطبيعية والمساعدة على توازن السكر في الدم.
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
          <Link
            href="/products/miracle-men-oil"
            className="card-base overflow-hidden p-0 hover:shadow-lg transition-shadow group"
          >
            <div className="relative min-h-[280px]">
              <Image src="/images/products/miracle-men-oil/hero.png" alt="الزيت المعجزة للرجال" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className="p-6 md:p-8">
              <div className="inline-block bg-[#160B08] text-amber-300 text-xs font-bold px-3 py-1 rounded-full mb-3">
                جديد · للرجال
              </div>
              <h2 className="font-extrabold text-[#102033] text-2xl md:text-3xl leading-tight mb-2">
                الزيت المعجزة للرجال
              </h2>
              <p className="text-sm text-[#667085] mb-4 leading-relaxed">
                زيت عناية خارجية للرجال، مبني على الخصوصية، الثقة، والدفع عند الاستلام.
              </p>
              <div className="text-yellow-400 text-sm mb-4">★★★★★ <span className="text-[#667085]">4.8 • عرض COD خاص</span></div>
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
              <span className="mt-6 block rounded-full bg-[#160B08] px-6 py-3 text-center text-sm font-bold text-white group-hover:bg-red-900">
                شاهد العرض بسرية
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
