"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useCartStore } from "./CartProvider";
import { ApiError, createOrder } from "@/lib/api";
import { isValidMoroccoMobile, toE164MoroccoPhone } from "@/lib/phone";
import { getBrowserFingerprint, getDeviceId } from "@/lib/fingerprint";
import { generateEventId } from "@/lib/event-id";
import { trackLead, trackPurchase } from "@/lib/tracking";
import { formatMad } from "@/lib/currency";
import { HERO_PRODUCT } from "@/config/products";
import { useRouter } from "next/navigation";

const schema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  phone: z.string().refine(isValidMoroccoMobile, {
    message: "أدخل رقم مغربي صحيح يبدأ بـ06 أو 07",
  }),
});

type FormData = z.infer<typeof schema>;
const DUPLICATE_ORDER_MESSAGE = "لقد توصلنا بطلبك بنجاح. المرجو انتظار مكالمة التأكيد.";

export function CheckoutPopup() {
  const { closeCheckout, selectedOffer, setLastOrderId, utm } = useCartStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // Focus trap and ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCheckout();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeCheckout]);

  const onSubmit = async (data: FormData) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const eventId = generateEventId("order");

    try {
      const order = await createOrder({
        name: data.name,
        phone_raw: data.phone,
        phone_e164: toE164MoroccoPhone(data.phone),
        offer_id: selectedOffer.id,
        qty: selectedOffer.qty,
        price_mad: selectedOffer.priceMad,
        sku: HERO_PRODUCT.sku,
        utm,
        event_id: eventId,
        whatsapp_e164: toE164MoroccoPhone(data.phone),
        browser_fingerprint: getBrowserFingerprint(),
        device_id: getDeviceId(),
      });

      trackLead({ value: selectedOffer.priceMad, eventId });
      trackPurchase({ value: selectedOffer.priceMad, eventId });
      setLastOrderId(order.order_id);
      closeCheckout();
      router.push(`/thank-you?order_id=${order.order_id}`);
    } catch (error) {
      console.error("Order creation failed", error);
      setError(error instanceof ApiError && error.status === 409 ? DUPLICATE_ORDER_MESSAGE : "تعذر إرسال الطلب. تأكد من الاتصال أو جرب مرة أخرى بعد لحظات.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && closeCheckout()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="أكمل طلبك"
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[95vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-[#102033]">أكمل طلبك الآن</h2>
          <button
            onClick={closeCheckout}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Order summary */}
        <div className="bg-[#EEF5FF] rounded-2xl p-4 mb-5">
          <div className="flex justify-between items-center text-sm mb-1">
            <span className="text-[#667085]">{selectedOffer.label} — {selectedOffer.qty} عبوة</span>
            <span className="font-bold text-[#DC2626]">{formatMad(selectedOffer.priceMad)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#667085]">طريقة الدفع</span>
            <span className="font-semibold text-[#16A34A]">نقداً عند الاستلام ✅</span>
          </div>
          <p className="text-xs text-[#667085] mt-2">الدفع عند الاستلام · سنتصل بك لتأكيد العنوان قبل الشحن</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-[#102033] mb-1.5">
              الاسم الكامل
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="مثال: فاطمة الزهراء"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1E4A8C] transition-colors"
              {...register("name")}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && (
              <p id="name-error" className="text-[#DC2626] text-xs mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-[#102033] mb-1.5">
              رقم الهاتف
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="0612345678"
              dir="ltr"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1E4A8C] transition-colors"
              {...register("phone")}
              aria-describedby={errors.phone ? "phone-error" : undefined}
            />
            {errors.phone && (
              <p id="phone-error" className="text-[#DC2626] text-xs mt-1">
                {errors.phone.message}
              </p>
            )}
          </div>

          {error && <p className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-4 text-center text-lg font-extrabold leading-7 text-[#B91C1C]">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="btn-red w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "جاري التسجيل..." : "أكد طلبي الآن"}
          </button>

          <p className="text-center text-xs text-[#667085]">
            لا تحتاج بطاقة بنكية. الدفع نقداً عند الاستلام.
          </p>
        </form>
      </div>
    </div>
  );
}
