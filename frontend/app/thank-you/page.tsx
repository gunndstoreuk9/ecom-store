"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getOrder, type Order } from "@/lib/api";
import { formatMad } from "@/lib/currency";
import { BRAND } from "@/config/brand";

export default function ThankYouPage() {
  return (
    <Suspense fallback={<ThankYouFallback />}>
      <ThankYouContent />
    </Suspense>
  );
}

function ThankYouContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (orderId && !orderId.startsWith("dev_")) {
      getOrder(orderId).then(setOrder).catch(() => null);
    }
  }, [orderId]);

  return (
    <div className="section-padding">
      <div className="container-main max-w-xl">
        {/* Success */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-[#102033] mb-2">تم تسجيل طلبك بنجاح</h1>
          <p className="text-[#667085]">شكراً لك! سنتصل بك قريباً لتأكيد تفاصيل الطلب.</p>
        </div>

        {/* Order Summary */}
        {order && (
          <div className="card-base p-6 mb-6">
            <h2 className="font-bold text-[#102033] mb-4">ملخص طلبك</h2>
            <div className="space-y-2 text-sm text-[#667085]">
              <div className="flex justify-between"><span>الاسم</span><span className="font-medium text-[#102033]">{order.name}</span></div>
              <div className="flex justify-between"><span>الكمية</span><span className="font-medium text-[#102033]">{order.qty} عبوة</span></div>
              <div className="flex justify-between"><span>السعر الأساسي</span><span>{formatMad(order.price_mad)}</span></div>
              <div className="flex justify-between font-bold text-[#102033] border-t pt-2 mt-2">
                <span>الإجمالي (عند الاستلام)</span>
                <span>{formatMad(order.total_mad)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Next steps */}
        <div className="card-base p-6 mb-6">
          <h2 className="font-bold text-[#102033] mb-4">الخطوات التالية</h2>
          <ol className="space-y-4">
            {[
              { icon: "📞", text: "سنتصل بك لتأكيد الطلب. جهز الهاتف للرد." },
              { icon: "📦", text: "بعد التأكيد، نجهز طلبك ونرسله لعنوانك." },
              { icon: "💵", text: "الدفع فقط عند الاستلام. لا دفع مسبق." },
            ].map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="text-2xl flex-shrink-0">{step.icon}</span>
                <p className="text-sm text-[#667085] leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Trust reminder */}
        <div className="bg-[#EEF5FF] rounded-2xl p-5 mb-6 text-center text-sm text-[#1E4A8C]">
          ✅ الدفع عند الاستلام · 🔒 ضمان رضا 30 يوم · 📞 دعم متاح
        </div>

        {/* WhatsApp */}
        <a
          href={`https://wa.me/${BRAND.whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-[#16A34A] text-white font-semibold hover:bg-green-700 transition-colors mb-4"
        >
          💬 راسلنا على واتساب
        </a>

        <div className="text-center">
          <Link href="/" className="text-sm text-[#1E4A8C] hover:underline">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function ThankYouFallback() {
  return (
    <div className="section-padding">
      <div className="container-main max-w-xl">
        <div className="card-base p-8 text-center">
          <div className="mx-auto mb-5 h-14 w-14 animate-pulse rounded-full bg-[#EEF5FF]" />
          <p className="font-bold text-[#102033]">كنحضرو ملخص الطلب...</p>
        </div>
      </div>
    </div>
  );
}
