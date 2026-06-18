"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Clock3, Flame, Lock, MapPin, Phone, ShieldCheck, Sparkles, Truck, User, type LucideIcon } from "lucide-react";
import { MobileStickyCta } from "@/components/layout/MobileStickyCta";
import { HERO_OFFERS, type OfferId } from "@/config/offers";
import { formatMad } from "@/lib/currency";
import { ApiError, createOrder } from "@/lib/api";
import { generateEventId } from "@/lib/event-id";
import { getBrowserFingerprint, getDeviceId } from "@/lib/fingerprint";
import { isValidMoroccoMobile, toE164MoroccoPhone } from "@/lib/phone";
import { trackLead, trackPurchase } from "@/lib/tracking";

const PRODUCT = {
  sku: "miracle-men-oil",
  name: "الزيت المعجزة للرجال",
  subtitle: "عناية رجالية خارجية للثقة، الحضور، والقرب الزوجي",
  hero: "/images/products/miracle-men-oil/hero.png",
  couple: "/images/products/miracle-men-oil/couple.png",
  lion: "/images/products/miracle-men-oil/lion.png",
};

const orderSchema = z.object({
  name: z.string().min(2, "الاسم ضروري"),
  phone: z.string().refine(isValidMoroccoMobile, {
    message: "أدخل رقم مغربي صحيح يبدأ بـ06 أو 07",
  }),
  city: z.string().min(2, "المدينة ضرورية"),
});

type OrderFormData = z.infer<typeof orderSchema>;

const DUPLICATE_ORDER_MESSAGE = "لقد توصلنا بطلبك بنجاح. المرجو انتظار مكالمة التأكيد.";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "ttclid", "gclid", "product_link_id", "product_link_slug"];

const PAINS = [
  "كتحس الثقة نقصات ومابقاش عندك نفس الحضور؟",
  "كتخاف اللحظة الخاصة تولي ضغط بدل متعة؟",
  "باغي تبان قدام زوجتك براس مرفوع وبلا تردد؟",
  "تعبتي من كلام كثير ومنتجات بلا تجربة شراء واضحة؟",
];

const BENEFITS = [
  { icon: Flame, title: "إحساس بالقوة", text: "روتين تدليك خارجي مصمم باش يعطيك إحساس أكثر بالثقة والحضور قبل اللحظات الخاصة." },
  { icon: ShieldCheck, title: "استعمال خاص وآمن", text: "منتج للعناية الخارجية، سهل الاستعمال، وكيجي بتغليف محترم يحافظ على الخصوصية." },
  { icon: Clock3, title: "مفعول طويل بالروتين", text: "أفضل استعمال هو الالتزام المنتظم، لأن الثقة كتتبنى بالاستمرارية ماشي بالصدفة." },
  { icon: Lock, title: "خصوصية كاملة", text: "طلبك كيتأكد بالهاتف، والتوصيل كيكون بتعامل محترم وبلا إحراج." },
];

const STEPS = [
  "اغسل المنطقة وجففها مزيان.",
  "استعمل كمية صغيرة ودلك بلطف حتى يتشرب الزيت.",
  "استعمله بانتظام حسب الحاجة، وتجنب الاستعمال على الجلد المتهيج.",
  "غسل اليدين بعد الاستعمال وحافظ عليه بعيداً عن الأطفال.",
];

const REVIEWS = [
  { name: "م. من الدار البيضاء", text: "كنت متردد بزاف، ولكن عجبني أن الطلب خاص ومكاين حتى دفع مسبق. المنتج وصلني مغلف ومستور." },
  { name: "س. من طنجة", text: "أكثر حاجة فرحاتني هي الإحساس بالثقة. ماشي غير منتج، حتى طريقة البيع والتأكيد كانت محترمة." },
  { name: "ع. من مراكش", text: "خديت عرض 3 عبوات حيث بغيت نكمل الروتين. الدعم جاوبني والطلب وصلني بلا إحراج." },
];

const FAQS = [
  ["واش الطلب كيكون خاص؟", "نعم. كنأكدو الطلب بالهاتف، والتوصيل كيكون محترم وبلا تفاصيل محرجة."],
  ["واش خاصني نخلص قبل؟", "لا. الدفع عند الاستلام. كتخلص غير ملي يوصلك الطلب."],
  ["كيفاش نستعمل الزيت؟", "استعمال خارجي فقط: كمية صغيرة مع تدليك لطيف، وبانتظام حسب الحاجة."],
  ["واش مناسب لأي واحد؟", "هو منتج عناية رجالية خارجية. إذا عندك حساسية جلدية أو تهيج، تجنب الاستعمال واستاشر مختص."],
  ["شنو أفضل عرض؟", "عرض 3 عبوات هو الأفضل من ناحية القيمة والاستمرارية، أما عبوة واحدة مناسبة للتجربة الأولى."],
];

function getTrackingParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(UTM_KEYS.flatMap((key) => {
    const value = params.get(key);
    return value ? [[key, value]] : [];
  }));
}

function scrollToOrderForm() {
  document.getElementById("cod-order")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function MiracleMenOilPage() {
  return (
    <>
      <section dir="rtl" className="relative overflow-hidden bg-[#160B08] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(220,38,38,0.45),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(245,158,11,0.35),transparent_28%)]" />
        <div className="container-main relative z-10 grid gap-8 py-7 md:py-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-black text-amber-200">
              <Sparkles className="h-4 w-4" />
              للرجال اللي بغاو يرجعو الحضور والثقة
            </div>
            <div className="relative overflow-hidden rounded-[28px] border border-amber-300/30 bg-black/30 p-1.5 shadow-2xl lg:hidden">
              <Image src={PRODUCT.hero} alt={PRODUCT.name} width={900} height={900} className="aspect-square w-full rounded-[22px] object-cover" priority />
            </div>
            <h1 className="text-4xl font-black leading-tight md:text-6xl">
              راك ماشي محتاج تبقى ساكت... <span className="text-amber-300">الثقة كتبدأ من هنا</span>
            </h1>
            <p className="max-w-2xl text-lg font-bold leading-9 text-white/80">
              {PRODUCT.name} هو زيت عناية رجالية خارجي للرجال اللي باغين يحسو بقوة الحضور، يهربو من التوتر، ويرجعو اللحظة الخاصة بثقة أكبر وخصوصية كاملة.
            </p>
            <DirectCodOrderForm embedded />
          </div>
          <div className="relative hidden lg:block">
            <div className="absolute -inset-5 rounded-[40px] bg-gradient-to-br from-red-600/35 to-amber-400/25 blur-2xl" />
            <div className="relative overflow-hidden rounded-[36px] border border-amber-300/30 bg-black/30 p-2 shadow-2xl">
              <Image src={PRODUCT.hero} alt={PRODUCT.name} width={900} height={900} className="h-auto w-full rounded-[28px] object-cover" priority />
            </div>
          </div>
        </div>
      </section>

      <section dir="rtl" className="bg-white py-12">
        <div className="container-main grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Image src={PRODUCT.lion} alt="صورة المنتج مع رمز القوة" width={900} height={900} className="rounded-[34px] shadow-2xl" />
          <div>
            <p className="mb-2 text-sm font-black text-red-600">المشكل ماشي غير منتج... المشكل هو الثقة</p>
            <h2 className="text-3xl font-black leading-tight text-[#102033] md:text-5xl">
              كل مرة كتأجل، كتخلي الشك يكبر
            </h2>
            <div className="mt-6 grid gap-3">
              {PAINS.map((pain) => (
                <div key={pain} className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-base font-extrabold text-red-800">
                  {pain}
                </div>
              ))}
            </div>
            <p className="mt-5 text-base font-bold leading-8 text-[#667085]">
              المنتج ما كيباعش بوعد فارغ. كيباع لأنه كيعطيك روتين واضح، خاص، وسهل يدخل فحياتك بلا إحراج وبلا دفع مسبق.
            </p>
          </div>
        </div>
      </section>

      <section dir="rtl" className="bg-[#FFF7ED] py-12">
        <div className="container-main">
          <SectionHeader kicker="علاش هذا المنتج مختلف؟" title="ماشي مجرد قنينة... هذا قرار ترجع الثقة" subtitle="كل جزء فالصفحة مبني باش ينقص التردد ويخليك تطلب براحة." />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#160B08] text-amber-300">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-black text-[#102033]">{title}</h3>
                <p className="mt-2 text-sm font-bold leading-7 text-[#667085]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section dir="rtl" className="bg-white py-12">
        <div className="container-main grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeader kicker="طريقة الاستعمال" title="روتين بسيط، خاص، وسهل" subtitle="استعمله بعقلانية وبانتظام، وخلي التجربة تكون محترمة وواضحة." />
            <div className="space-y-3">
              {STEPS.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-2xl bg-[#F8FAFC] p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-black text-white">{index + 1}</span>
                  <p className="font-bold leading-7 text-[#102033]">{step}</p>
                </div>
              ))}
            </div>
          </div>
          <Image src={PRODUCT.couple} alt="ثقة زوجية وخصوصية" width={900} height={900} className="rounded-[34px] shadow-2xl" />
        </div>
      </section>

      <section dir="rtl" className="bg-[#160B08] py-12 text-white">
        <div className="container-main">
          <SectionHeader kicker="آراء واقعية" title="رجال طلبو بسرية وارتاحو من التردد" subtitle="تجارب مختصرة من زبناء اختارو الدفع عند الاستلام والخصوصية." light />
          <div className="grid gap-4 md:grid-cols-3">
            {REVIEWS.map((review) => (
              <div key={review.name} className="rounded-[28px] border border-white/10 bg-white/10 p-5">
                <div className="mb-3 text-amber-300">★★★★★</div>
                <p className="text-sm font-bold leading-7 text-white/85">«{review.text}»</p>
                <p className="mt-4 text-sm font-black text-amber-200">{review.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section dir="rtl" className="bg-white py-12">
        <div className="container-main">
          <SectionHeader kicker="أسئلة كتجي قبل الطلب" title="جاوبنا على التردد قبل ما تطلب" subtitle="طلبك خاص، مؤكد بالهاتف، والدفع حتى تستلم." />
          <div className="mx-auto grid max-w-4xl gap-3">
            {FAQS.map(([q, a]) => (
              <details key={q} className="group rounded-2xl border border-gray-100 bg-[#F8FAFC] p-4">
                <summary className="cursor-pointer text-base font-black text-[#102033]">{q}</summary>
                <p className="mt-3 text-sm font-bold leading-7 text-[#667085]">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section dir="rtl" className="bg-gradient-to-br from-red-700 to-[#160B08] py-12 text-white">
        <div className="container-main text-center">
          <h2 className="text-3xl font-black leading-tight md:text-5xl">إلى بغيتي تبقى كتفكر، غادي يبقى التردد هو اللي رابح</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-bold leading-8 text-white/80">
            دخل معلوماتك، الفريق يتصل بك، كتأكد الثمن والعنوان، وتخلص غير عند الاستلام.
          </p>
          <button onClick={scrollToOrderForm} className="mt-6 rounded-full bg-amber-400 px-8 py-4 text-lg font-black text-[#160B08] transition hover:bg-amber-300">
            اطلب الآن — بلا دفع مسبق
          </button>
        </div>
      </section>

      <MobileStickyCta label="اطلب الزيت الآن — الدفع عند الاستلام" targetId="cod-order" />
    </>
  );
}

function DirectCodOrderForm({ embedded = false }: { embedded?: boolean } = {}) {
  const router = useRouter();
  const [selectedOfferId, setSelectedOfferId] = useState<OfferId>("three");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const selectedOffer = HERO_OFFERS.find((offer) => offer.id === selectedOfferId) ?? HERO_OFFERS[2];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: { name: "", phone: "", city: "" },
  });

  async function onSubmit(data: OrderFormData) {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const eventId = generateEventId("order");

    try {
      const order = await createOrder({
        name: data.name,
        phone_raw: data.phone,
        phone_e164: toE164MoroccoPhone(data.phone),
        city: data.city,
        offer_id: selectedOffer.id,
        qty: selectedOffer.qty,
        price_mad: selectedOffer.priceMad,
        sku: PRODUCT.sku,
        utm: getTrackingParams(),
        event_id: eventId,
        whatsapp_e164: toE164MoroccoPhone(data.phone),
        browser_fingerprint: getBrowserFingerprint(),
        device_id: getDeviceId(),
      });

      trackLead({ value: selectedOffer.priceMad, eventId });
      trackPurchase({ value: selectedOffer.priceMad, eventId });
      router.push(`/thank-you?order_id=${order.order_id}`);
    } catch (error) {
      console.error("Order creation failed", error);
      setSubmitError(error instanceof ApiError && error.status === 409 ? DUPLICATE_ORDER_MESSAGE : "تعذر إرسال الطلب. تأكد من الاتصال أو جرب مرة أخرى بعد لحظات.");
    } finally {
      setSubmitting(false);
    }
  }

  if (embedded) {
    return (
      <div id="cod-order" className="rounded-[28px] border border-amber-300/20 bg-white p-3 text-[#102033] shadow-2xl md:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black">اختر العرض المناسب:</p>
            <p className="text-xs font-bold text-[#667085]">اختيارك الحالي ظاهر باللون الأحمر</p>
          </div>
          <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-black text-white">COD ✓</span>
        </div>

        <div className="grid gap-2">
          {HERO_OFFERS.map((offer) => (
            <button
              key={offer.id}
              type="button"
              onClick={() => setSelectedOfferId(offer.id)}
              className={`relative rounded-2xl border-2 px-4 py-3 text-right transition ${
                selectedOfferId === offer.id ? "border-red-600 bg-red-50" : "border-gray-200 bg-white hover:border-red-300"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-black text-[#102033]">{offer.sublabel}</p>
                  <p className="text-[11px] font-bold text-[#667085]">{offer.savings || offer.label}</p>
                </div>
                <div className="text-left">
                  <p className="text-xl font-black text-red-600">{formatMad(offer.priceMad)}</p>
                  {offer.default ? <p className="text-[10px] font-black text-green-700">الأكثر طلباً</p> : null}
                </div>
              </div>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-3" noValidate>
          <Field icon={User} placeholder="الاسم الكامل" error={errors.name?.message} props={register("name")} compact />
          <Field icon={Phone} placeholder="رقم الهاتف المغربي" error={errors.phone?.message} props={register("phone")} type="tel" compact />
          <Field icon={MapPin} placeholder="المدينة" error={errors.city?.message} props={register("city")} compact />

          <div className="rounded-2xl bg-[#FFF7ED] p-3">
            <div className="flex items-center justify-between text-xs font-bold text-[#667085]">
              <span>العرض المختار</span>
              <span>{selectedOffer.sublabel}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-orange-100 pt-2">
              <span className="text-sm font-black text-[#102033]">المبلغ عند الاستلام</span>
              <span className="text-2xl font-black text-red-600">{formatMad(selectedOffer.priceMad)}</span>
            </div>
          </div>

          <button disabled={submitting} className="min-h-[58px] w-full rounded-2xl bg-red-600 px-5 py-4 text-lg font-black text-white shadow-lg shadow-red-900/25 transition hover:bg-red-700 disabled:opacity-60">
            {submitting ? "جاري تسجيل الطلب..." : "اطلب الآن بسرية — الدفع عند الاستلام"}
          </button>

          {submitError ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-base font-extrabold leading-7 text-[#B91C1C]">
              {submitError}
            </p>
          ) : null}

          <p className="text-center text-[11px] font-bold leading-5 text-[#667085]">
            بياناتك محمية · لا دفع مسبق · سنتصل بك للتأكيد قبل الإرسال
          </p>
        </form>
      </div>
    );
  }

  return (
    <section id="cod-order" dir="rtl" className="bg-gradient-to-b from-white via-[#FFF7ED] to-white py-12">
      <div className="container-main max-w-6xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex rounded-full bg-red-600 px-5 py-2 text-sm font-black text-white shadow-lg">
            تسجيل الطلب بسرية كاملة
          </div>
          <h2 className="text-3xl font-black leading-tight text-[#102033] md:text-5xl">اختار العرض وخلي الفريق يتاصل بك للتأكيد</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-7 text-[#667085]">
            ما كاين لا دفع مسبق لا إحراج. كتدخل معلوماتك، كنأكدو معاك فالهاتف، وكتخلص غير عند الاستلام.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative overflow-hidden rounded-[34px] bg-[#160B08] p-5 text-white shadow-2xl md:p-6">
            <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-red-600/30 blur-3xl" />
            <div className="absolute -bottom-16 right-10 h-44 w-44 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="relative">
              <Image src={PRODUCT.lion} alt={PRODUCT.name} width={900} height={900} className="mb-4 rounded-[26px] object-cover shadow-xl" />
              <h3 className="text-2xl font-black leading-tight">قرار صغير دابا... يقدر يبدل إحساسك بالثقة</h3>
              <p className="mt-3 text-sm font-bold leading-7 text-white/75">
                الطلب خاص، التوصيل محترم، والمكالمة فقط لتأكيد المعلومات قبل الإرسال.
              </p>
              <div className="mt-5 grid gap-2">
                {[
                  ["1", "اختار العرض المناسب"],
                  ["2", "دخل الاسم والهاتف والمدينة"],
                  ["3", "كنعيطو لك ونأكدو الطلب بسرية"],
                  ["4", "كتخلص غير ملي تستلم"],
                ].map(([step, text]) => (
                  <div key={step} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-sm font-black text-[#160B08]">{step}</span>
                    <span className="text-sm font-black">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[34px] border-2 border-red-100 bg-white p-4 shadow-2xl md:p-6">
            <div className="mb-4 rounded-3xl bg-red-50 p-4 text-center">
              <p className="text-sm font-black text-red-700">العرض الحالي محدود حسب المخزون</p>
              <p className="mt-1 text-xs font-bold text-[#667085]">اختيار العرض الكبير كينقص عليك الثمن وكيعطيك مدة استعمال أطول</p>
            </div>

            <div className="mb-5 grid gap-3">
              {HERO_OFFERS.map((offer) => (
                <button
                  key={offer.id}
                  type="button"
                  onClick={() => setSelectedOfferId(offer.id)}
                  className={`relative overflow-hidden rounded-3xl border-2 p-4 text-right transition ${
                    selectedOfferId === offer.id ? "border-red-600 bg-red-50 shadow-lg shadow-red-900/10" : "border-gray-200 bg-white hover:border-red-300"
                  }`}
                >
                  {offer.default ? (
                    <span className="absolute left-4 top-3 rounded-full bg-[#160B08] px-3 py-1 text-[10px] font-black text-amber-300">
                      الأكثر اختياراً
                    </span>
                  ) : null}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xl font-black text-[#102033]">{offer.sublabel}</p>
                      <p className="mt-1 text-xs font-bold text-[#667085]">{offer.savings || offer.label}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-2xl font-black text-red-600">{formatMad(offer.priceMad)}</p>
                      <p className="text-[11px] font-bold text-[#667085]">الدفع عند الاستلام</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Field icon={User} placeholder="الاسم الكامل" error={errors.name?.message} props={register("name")} />
              <Field icon={Phone} placeholder="رقم الهاتف المغربي" error={errors.phone?.message} props={register("phone")} type="tel" />
              <Field icon={MapPin} placeholder="المدينة" error={errors.city?.message} props={register("city")} />

              <div className="rounded-3xl bg-[#160B08] p-4 text-white">
                <div className="flex justify-between text-sm font-bold text-white/70"><span>العرض المختار</span><span>{selectedOffer.sublabel}</span></div>
                <div className="mt-2 flex justify-between border-t border-white/10 pt-3 text-xl font-black"><span>المبلغ عند الاستلام</span><span className="text-amber-300">{formatMad(selectedOffer.priceMad)}</span></div>
              </div>

              <button disabled={submitting} className="min-h-[66px] w-full rounded-3xl bg-red-600 px-5 py-4 text-xl font-black text-white shadow-xl shadow-red-900/25 transition hover:bg-red-700 disabled:opacity-60">
                {submitting ? "جاري تسجيل الطلب..." : "اطلب الآن بسرية — الدفع عند الاستلام"}
              </button>

              {submitError ? (
                <p className="rounded-3xl border-2 border-red-200 bg-red-50 px-5 py-4 text-center text-xl font-extrabold leading-8 text-[#B91C1C] shadow-sm">
                  {submitError}
                </p>
              ) : null}

              <div className="grid gap-2 text-xs font-black text-[#667085] sm:grid-cols-3">
                <span className="flex items-center justify-center gap-1 rounded-full bg-[#F8FAFC] px-3 py-2"><ShieldCheck className="h-4 w-4 text-green-600" /> بياناتك محمية</span>
                <span className="flex items-center justify-center gap-1 rounded-full bg-[#F8FAFC] px-3 py-2"><Truck className="h-4 w-4 text-red-600" /> توصيل سريع</span>
                <span className="flex items-center justify-center gap-1 rounded-full bg-[#F8FAFC] px-3 py-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> لا دفع مسبق</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  icon: Icon,
  placeholder,
  error,
  props,
  type = "text",
  compact = false,
}: {
  icon: LucideIcon;
  placeholder: string;
  error?: string;
  props: UseFormRegisterReturn;
  type?: string;
  compact?: boolean;
}) {
  return (
    <div>
      <div className="flex overflow-hidden rounded-2xl border-2 border-gray-200 bg-white focus-within:border-red-600">
        <input
          type={type}
          inputMode={type === "tel" ? "tel" : "text"}
          placeholder={placeholder}
          className={`${compact ? "min-h-[50px] text-base" : "min-h-[58px] text-lg"} flex-1 px-4 text-right font-bold outline-none placeholder:text-gray-400`}
          {...props}
        />
        <span className={`${compact ? "w-14" : "w-16"} flex items-center justify-center border-r border-gray-200 bg-gray-50 text-[#160B08]`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {error ? <p className="mt-1 text-xs font-bold text-red-600">{error}</p> : null}
    </div>
  );
}

function SectionHeader({ kicker, title, subtitle, light = false }: { kicker: string; title: string; subtitle: string; light?: boolean }) {
  return (
    <div className="mx-auto mb-9 max-w-3xl text-center">
      <p className={`mb-2 text-sm font-black ${light ? "text-amber-300" : "text-red-600"}`}>{kicker}</p>
      <h2 className={`text-3xl font-black leading-tight md:text-5xl ${light ? "text-white" : "text-[#102033]"}`}>{title}</h2>
      <p className={`mt-3 text-sm font-bold leading-7 ${light ? "text-white/70" : "text-[#667085]"}`}>{subtitle}</p>
    </div>
  );
}
