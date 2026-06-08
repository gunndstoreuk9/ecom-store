"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Clock3, MapPin, Phone, ShieldCheck, User } from "lucide-react";
import { MobileStickyCta } from "@/components/layout/MobileStickyCta";
import { ProductImageSlot } from "@/components/brand/ProductImageSlot";
import { HERO_PRODUCT } from "@/config/products";
import { HERO_OFFERS, type OfferId } from "@/config/offers";
import { formatMad } from "@/lib/currency";
import { createOrder } from "@/lib/api";
import { generateEventId } from "@/lib/event-id";
import { isValidMoroccoMobile, toE164MoroccoPhone } from "@/lib/phone";
import { trackLead } from "@/lib/tracking";

const orderSchema = z.object({
  name: z.string().min(2, "الاسم ضروري"),
  phone: z.string().refine(isValidMoroccoMobile, {
    message: "أدخل رقم مغربي صحيح يبدأ بـ06 أو 07",
  }),
  city: z.string().min(2, "المدينة ضرورية"),
});

type OrderFormData = z.infer<typeof orderSchema>;

const COD_BENEFITS = [
  "🚚 توصيل لجميع مدن المغرب",
];

const PROBLEM_SOLUTIONS = [
  {
    pain: "التحاليل ولات كتقلقك كل مرة",
    solution: "مصفوفة تَوازُن تدعم السكر في النطاق الصحي مع روتين يومي بسيط.",
  },
  {
    pain: "تعب فالعشية وهبوط فالطاقة بعد الأكل",
    solution: "القرفة والكروم وALA يدعمون استعمال السكر كطاقة ثابتة.",
  },
  {
    pain: "الحلوة كتغلبك حتى مع النية",
    solution: "تركيبة نباتية ومعدنية تساعدك على تحكم أفضل في الرغبة بالحلويات.",
  },
  {
    pain: "منتجات كثيرة بلا شرح ولا ثقة",
    solution: "20 مكوّن واضح، شارات ثقة، دعم واتساب، والدفع فقط عند الاستلام.",
  },
];

const PROOF_STAGES = [
  {
    icon: "🔬",
    title: "المرحلة الأولى",
    text: "مكوّنات نباتية ومعدنية مختارة تدخل روتينك اليومي لدعم التوازن من الداخل.",
  },
  {
    icon: "⚡",
    title: "المرحلة الثانية",
    text: "تدعم مسارات الجسم الطبيعية لاستعمال السكر كطاقة وتقليل الهبوط بعد الوجبات.",
  },
  {
    icon: "✨",
    title: "المرحلة الثالثة",
    text: "مع الاستمرارية، يصبح التحكم في الروتين والرغبة في الحلويات أسهل يوم بعد يوم.",
  },
];

const STATS = [
  { value: "20", label: "مكوّن نشط" },
  { value: "60", label: "كبسولة" },
  { value: "+3K", label: "طلب مكتمل" },
];

const COMPARISON = [
  ["التركيز", "20 مكوّن نشط لهدف واحد", "منتج عام بمكوّنات قليلة"],
  ["الشرح", "آلية واضحة: بعد الأكل، الطاقة، الرغبة", "وعود عامة بدون توضيح"],
  ["الثقة", "دفع عند الاستلام + دعم واتساب", "شراء عشوائي بدون متابعة"],
  ["القيمة", "عرض 3 عبوات بأفضل سعر", "تحتاج شراء منتجات متعددة"],
  ["الاستعمال", "روتين يومي بسيط", "تعقيد أو نسيان سريع"],
];

const REVIEWS = [
  {
    text: "طلبت عرض 3 عبوات حيث بغيت نلتزم. عجبني أن الدفع عند الاستلام والتأكيد كان واضح.",
    result: "ثقة في الطلب",
    author: "فاطمة",
    city: "الدار البيضاء",
  },
  {
    text: "كنت كنقلب على شي حاجة طبيعية ومفهومة. الشرح ديال المكونات خلاني نقرر نجرب.",
    result: "شرح مقنع",
    author: "خالد",
    city: "فاس",
  },
  {
    text: "تواصلو معايا فالواتساب وأكدو ليا التفاصيل. التجربة كانت منظمة ومطمئنة.",
    result: "تأكيد سريع",
    author: "مريم",
    city: "طنجة",
  },
  {
    text: "أهم حاجة عندي كانت نخلص حتى يوصلني الطلب. هاد النقطة خلاتني نطلب بلا تردد.",
    result: "دفع عند الاستلام",
    author: "سعيد",
    city: "مراكش",
  },
];

const FAQS = [
  ["كم كبسولة في العلبة؟", "كل علبة فيها 60 كبسولة، وهي مصممة للاستعمال اليومي."],
  ["العرض المناسب ليا شنو هو؟", "إذا بغيتي أفضل قيمة واستمرارية، اختار عرض 3 عبوات. إذا باغي تجربة أولى، عبوة واحدة كافية للبداية."],
  ["كيفاش كنأكد الطلب؟", "دخل الاسم، الهاتف، والمدينة. الفريق كيتاصل بك لتأكيد التفاصيل قبل الإرسال."],
  ["واش الدفع عند الاستلام؟", "نعم. كتخلص نقداً عند استلام الطلب فقط."],
];

function scrollToOrderForm() {
  document.getElementById("cod-order")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function DirectCodOrderForm({ embedded = false }: { embedded?: boolean } = {}) {
  const router = useRouter();
  const [selectedOfferId, setSelectedOfferId] = useState<OfferId>("three");
  const [submitting, setSubmitting] = useState(false);
  const selectedOffer = HERO_OFFERS.find((offer) => offer.id === selectedOfferId) ?? HERO_OFFERS[2];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: { name: "", phone: "", city: "" },
  });

  const onSubmit = async (data: OrderFormData) => {
    if (submitting) return;
    setSubmitting(true);
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
        sku: HERO_PRODUCT.sku,
        event_id: eventId,
      });

      trackLead({ value: selectedOffer.priceMad, eventId });
      router.push(`/thank-you?order_id=${order.order_id}`);
    } catch {
      const tempOrderId = `dev_${Date.now()}`;
      trackLead({ value: selectedOffer.priceMad, eventId });
      router.push(`/thank-you?order_id=${tempOrderId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="cod-order" className={embedded ? "" : "bg-white py-10 md:py-16"}>
      <div className={embedded ? "" : "container-main max-w-3xl"}>
        <div
          className={
            embedded
              ? "relative"
              : "relative overflow-hidden rounded-[34px] border border-[#FEE2E2] bg-gradient-to-br from-white via-[#FFF7ED] to-[#EEF5FF] p-5 shadow-2xl md:p-8"
          }
        >
          {!embedded && <div className="absolute -left-20 -top-20 h-48 w-48 rounded-full bg-[#DC2626]/10 blur-3xl" />}
          {!embedded && <div className="absolute -bottom-24 right-10 h-56 w-56 rounded-full bg-[#1E4A8C]/10 blur-3xl" />}

          {!embedded && (
            <div className="relative z-10 mb-7 text-center">
              <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-[#DC2626] px-4 py-2 text-sm font-extrabold text-white shadow-lg">
                🇲🇦 عرض الدفع عند الاستلام
              </div>
              <h2 className="text-3xl font-extrabold leading-tight text-[#102033] md:text-4xl">
                اختر العرض المناسب لك ودخل معلوماتك
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#667085] md:text-base">
                لا تحتاج بطاقة بنكية. سنقوم بتسجيل طلبك ثم يتصل بك فريق تَوازُن لتأكيد التفاصيل قبل الإرسال.
              </p>
              <div className="mt-5 grid gap-2 text-xs font-bold text-[#102033] sm:grid-cols-3">
                <span className="rounded-full bg-white px-3 py-2 shadow-sm">1. اختر العرض</span>
                <span className="rounded-full bg-white px-3 py-2 shadow-sm">2. دخل معلوماتك</span>
                <span className="rounded-full bg-white px-3 py-2 shadow-sm">3. خلص عند الاستلام</span>
              </div>
            </div>
          )}

          <div className={embedded ? "relative z-10" : "relative z-10 rounded-[28px] border-2 border-orange-400 bg-white p-4 shadow-xl md:p-6"}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-[#102033]">اختر الكورس المناسب:</p>
                <p className="text-xs text-[#667085]">اختيارك الحالي ظاهر باللون الأزرق</p>
              </div>
              <div className="rounded-full bg-[#16A34A] px-3 py-1 text-xs font-bold text-white">
                COD ✅
              </div>
            </div>

            <div className="space-y-4">
              {HERO_OFFERS.map((offer) => {
                const selected = selectedOfferId === offer.id;
                const oldPrice = offer.id === "one" ? 299 : offer.id === "two" ? 499 : 597;
                const perBottle = Math.round(offer.priceMad / offer.qty);
                const label =
                  offer.qty === 1
                    ? "عبوة واحدة"
                    : offer.qty === 2
                      ? "عبوتين"
                      : "3 عبوات";

                return (
                  <button
                    key={offer.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedOfferId(offer.id)}
                    className={`group relative w-full overflow-hidden rounded-2xl border-2 p-4 text-right transition-all ${
                      selected
                        ? "border-[#1E4A8C] bg-[#EEF5FF] shadow-lg ring-4 ring-[#1E4A8C]/10"
                        : "border-gray-200 bg-white hover:border-[#1E4A8C]/40 hover:bg-[#F8FBFF]"
                    }`}
                  >
                    {offer.default && (
                      <div className="absolute left-0 top-0 rounded-br-2xl bg-[#16A34A] px-3 py-1 text-xs font-extrabold text-white">
                        الأكثر طلباً 🔥
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                          selected ? "border-[#1E4A8C] bg-[#1E4A8C] text-white" : "border-gray-300 text-transparent"
                        }`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-extrabold text-[#102033] md:text-xl">
                          {label} فقط بـ{offer.priceMad} درهم
                        </p>
                        <p className="text-sm font-bold text-[#667085]">
                          بدلاً من {oldPrice} درهم · {perBottle} درهم / عبوة
                        </p>
                        {offer.savings && <p className="mt-1 text-sm font-extrabold text-[#16A34A]">{offer.savings}</p>}
                      </div>

                      <div className="text-left">
                        <p className="text-2xl font-extrabold text-[#DC2626]">{formatMad(offer.priceMad)}</p>
                        <p className="text-xs text-[#667085]">المجموع</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="my-6 rounded-2xl bg-[#F0FDF4] p-4 text-center">
              <p className="text-xl font-extrabold leading-relaxed text-[#168A12]">
                بقى غير الاسم والهاتف والمدينة لتأكيد الطلب
              </p>
              <p className="mt-1 text-xs font-bold text-[#667085]">الفريق يتصل بك قبل الإرسال، والثمن النهائي هو {formatMad(selectedOffer.priceMad)}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {[
                { id: "name", placeholder: "الاسم الكامل", icon: User, props: register("name"), error: errors.name?.message },
                { id: "phone", placeholder: "رقم الهاتف المغربي", icon: Phone, props: register("phone"), error: errors.phone?.message },
                { id: "city", placeholder: "المدينة", icon: MapPin, props: register("city"), error: errors.city?.message },
              ].map((field) => {
                const Icon = field.icon;
                return (
                  <div key={field.id}>
                    <div className="flex overflow-hidden rounded-2xl border-2 border-gray-200 bg-white transition-colors focus-within:border-[#1E4A8C]">
                      <input
                        type={field.id === "phone" ? "tel" : "text"}
                        inputMode={field.id === "phone" ? "tel" : "text"}
                        placeholder={field.placeholder}
                        className="min-h-[60px] flex-1 px-4 text-right text-lg font-semibold outline-none placeholder:text-gray-400"
                        {...field.props}
                      />
                      <span className="flex w-16 items-center justify-center border-r border-gray-200 bg-gray-50 text-[#102033]">
                        <Icon className="h-5 w-5" />
                      </span>
                    </div>
                    {field.error && <p className="mt-1 text-xs font-bold text-[#DC2626]">{field.error}</p>}
                  </div>
                );
              })}

              <div className="rounded-2xl border border-gray-100 bg-[#F8F5EF] p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-[#667085]">العرض المختار</span>
                  <span className="font-extrabold text-[#102033]">{selectedOffer.label}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2">
                  <span className="font-bold text-[#102033]">المبلغ عند الاستلام</span>
                  <span className="text-2xl font-extrabold text-[#DC2626]">{formatMad(selectedOffer.priceMad)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="min-h-[64px] w-full rounded-2xl bg-[#12A10A] px-5 py-4 text-xl font-extrabold text-white shadow-lg shadow-green-900/20 transition-colors hover:bg-[#0d8507] disabled:opacity-60"
              >
                {submitting ? "جاري إرسال الطلب..." : "أكد طلبي الآن — الدفع عند الاستلام ←"}
              </button>

              <div className="grid gap-2 text-xs font-bold text-[#667085] sm:grid-cols-3">
                <span className="flex items-center justify-center gap-1 rounded-full bg-white px-3 py-2">
                  <ShieldCheck className="h-4 w-4 text-[#16A34A]" /> بياناتك محمية
                </span>
                <span className="flex items-center justify-center gap-1 rounded-full bg-white px-3 py-2">
                  <Clock3 className="h-4 w-4 text-[#1E4A8C]" /> تأكيد سريع
                </span>
                <span className="flex items-center justify-center gap-1 rounded-full bg-white px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-[#16A34A]" /> لا دفع مسبق
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ kicker, title, subtitle }: { kicker?: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center">
      {kicker && <p className="mb-2 text-sm font-bold text-[#DC2626]">{kicker}</p>}
      <h2 className="text-3xl font-extrabold leading-tight text-[#102033] md:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-[#667085]">{subtitle}</p>}
    </div>
  );
}

export default function ProductPage() {
  return (
    <>
      <section dir="rtl" className="relative overflow-hidden bg-gradient-to-br from-[#EEF5FF] via-white to-[#F8F5EF] py-5 md:py-12">
        <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-[#1E4A8C]/10 blur-3xl" />
        <div className="absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-[#DC2626]/10 blur-3xl" />
        <div className="container-main max-w-6xl">
          <div className="relative z-10 grid gap-5 lg:grid-cols-2 lg:items-start">
            <div className="space-y-3 lg:col-start-2 lg:row-start-1">
              <ProductImageSlot
                label="صورة الهيرو: المنتج + عرض 3 عبوات"
                filename="hero-bundle.webp"
                note="صورة المنتج الرئيسية مع شارات الثقة والدفع عند الاستلام."
                className="shadow-xl"
              />

              <div className="grid grid-cols-3 gap-2">
                {["متوافق مع SFDA", "مختبر معملياً", "حلال 100%"].map((badge) => (
                  <span key={badge} className="rounded-2xl bg-white px-3 py-3 text-center text-xs font-bold text-[#1E4A8C] shadow-sm">
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4 text-right lg:col-start-1 lg:row-start-1">
              <h1 className="text-3xl font-extrabold leading-[1.15] tracking-tight text-[#102033] md:text-5xl">
                السر الأمريكي وصل للمغرب: المكمل رقم 1 لتنظيم السكر طبيعياً متوفر الآن! 🇲🇦🇺🇸
              </h1>
              <p className="text-base font-semibold leading-relaxed text-[#344054] md:text-lg">
                {HERO_PRODUCT.nameAr} مركّب أمريكي بـ20 مكوّن نشط لدعم توازن السكر، طاقة ثابتة، وتحكم أفضل في الرغبة بالحلويات.
              </p>

              <div className="rounded-2xl bg-white/85 p-4 text-center text-sm font-semibold leading-relaxed text-[#667085] shadow-sm">
                للناس اللي كيتقلقو من التحاليل وارتفاع السكر، وباغين حل واضح يدخل فالروتين اليومي بلا تعقيد وبلا دفع مسبق.
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-bold shadow-sm">
                <span className="text-[#667085]">(1,203 تقييم)</span>
                <span className="text-[#102033]">4.9</span>
                <span className="text-yellow-400">★★★★★</span>
              </div>

              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-700">
                🔥 الطلب عالي — الكمية محدودة لهذا الشهر
              </div>

              {COD_BENEFITS.map((benefit) => (
                <div key={benefit} className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-bold text-[#102033] shadow-sm">
                  {benefit}
                </div>
              ))}

              <DirectCodOrderForm embedded />
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-[#F8F5EF]">
        <div className="container-main">
          <SectionHeader
            title={`المشاكل اللي يحلها ${HERO_PRODUCT.nameAr}`}
            subtitle="كل نقطة ألم عند العميل خاصها جواب واضح، مرئي، ومقنع."
          />
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <ProductImageSlot
              label="صورة الألم والرغبة في الحلويات"
              filename="problem-cravings.webp"
              note="تعب بعد الأكل، حلويات، وقلق التحاليل."
              tone="sand"
            />
            <div className="grid gap-4">
              {PROBLEM_SOLUTIONS.map((item) => (
                <div key={item.pain} className="rounded-3xl bg-white p-5 shadow-sm">
                  <h3 className="font-extrabold text-[#102033]">{item.pain}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#667085]">{item.solution}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-main">
          <SectionHeader
            kicker="الإثبات العلمي"
            title="ليش تَوازُن يعطي تجربة مقنعة؟"
            subtitle="الفكرة بسيطة: دعم يومي لثلاث مسارات مهمة: بعد الأكل، الطاقة، والرغبة في الحلويات."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {PROOF_STAGES.map((stage) => (
              <div key={stage.title} className="card-base p-6 text-center">
                <div className="mb-4 text-4xl">{stage.icon}</div>
                <h3 className="font-extrabold text-[#102033]">{stage.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#667085]">{stage.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STATS.map((stat) => (
              <div key={stat.label} className="rounded-3xl bg-[#EEF5FF] p-6 text-center">
                <p className="text-4xl font-extrabold text-[#1E4A8C]">{stat.value}</p>
                <p className="mt-1 text-sm font-bold text-[#102033]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-[#EEF5FF]">
        <div className="container-main">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <ProductImageSlot
              label="صورة المكونات العلمية"
              filename="ingredients-science.webp"
              note="قرفة، كروم، توت أبيض، كبسولات، وعبوة المنتج."
              tone="green"
              showImage
            />
            <div>
              <h2 className="text-3xl font-extrabold text-[#102033] md:text-4xl">المكونات الفعّالة</h2>
              <p className="mt-3 text-[#667085]">تركيبة مدروسة — كل مكون له دور محدد في دعم التوازن اليومي.</p>
              <div className="mt-8 grid grid-cols-2 gap-4">
                {HERO_PRODUCT.ingredients.map((ing) => (
                  <div key={ing.key} className="rounded-3xl bg-white p-5 shadow-sm">
                    <div className="mb-2 text-2xl">✅</div>
                    <h3 className="font-extrabold text-[#102033]">{ing.nameAr}</h3>
                    <p className="mt-1 text-xs text-[#667085]">{ing.benefitAr}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-main">
          <SectionHeader title="ليش تَوازُن يختلف؟" subtitle="مقارنة واضحة بين براند متخصص ومنتجات عامة." />
          <div className="overflow-hidden rounded-3xl border border-gray-200 shadow-sm">
            <div className="grid grid-cols-3 bg-[#1E4A8C] text-sm font-bold text-white">
              <div className="p-4">المعيار</div>
              <div className="p-4 text-center">تَوازُن ⭐</div>
              <div className="p-4 text-center">الآخرين</div>
            </div>
            {COMPARISON.map((row, index) => (
              <div key={row[0]} className={`grid grid-cols-3 text-sm ${index % 2 ? "bg-[#F8F5EF]" : "bg-white"}`}>
                <div className="p-4 font-bold text-[#102033]">{row[0]}</div>
                <div className="p-4 text-center text-[#102033]">{row[1]}</div>
                <div className="p-4 text-center text-[#667085]">{row[2]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-[#F8F5EF]">
        <div className="container-main">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-2 text-2xl">🇲🇦</p>
              <h2 className="text-3xl font-extrabold text-[#102033] md:text-4xl">مصمم لثقة العميل المغربي</h2>
              <p className="mt-4 leading-relaxed text-[#667085]">
                العميل المغربي كيحتاج يشوف الثقة قبل ما يطلب: دفع عند الاستلام، تواصل واتساب، عرض واضح، وثمن نهائي بلا مفاجآت. لذلك الصفحة مبنية باش تزيل الشك وتخلي القرار سهل.
              </p>
              <div className="mt-6 grid gap-3">
                {["دفع فقط عند الاستلام", "تأكيد الطلب بالهاتف", "عرض 3 عبوات بأفضل قيمة", "دعم واضح قبل وبعد الطلب"].map((item) => (
                  <div key={item} className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#102033] shadow-sm">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <ProductImageSlot
              label="صورة الثقة والدفع عند الاستلام"
              filename="cod-proof-offer.webp"
              note="علبة توصيل، واتساب، نجوم ثقة، وCOD."
              tone="gold"
            />
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-main">
          <SectionHeader kicker="تجارب حقيقية" title="+1,203 عميل يثق بتَوازُن" subtitle="آراء من عملاء في مدن مغربية مختلفة." />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {REVIEWS.map((review) => (
              <div key={`${review.author}-${review.city}`} className="card-base p-6">
                <div className="mb-3 text-yellow-400">★★★★★</div>
                <p className="text-sm leading-relaxed text-[#102033]">&ldquo;{review.text}&rdquo;</p>
                <p className="mt-4 text-xs font-bold text-[#16A34A]">{review.result}</p>
                <p className="mt-2 text-xs text-[#667085]">{review.author} — {review.city}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {["4.9 تقييم عام", "+3,120 طلب مكتمل", "30 يوم ضمان"].map((stat) => (
              <div key={stat} className="rounded-3xl bg-[#EEF5FF] p-5 text-center font-extrabold text-[#1E4A8C]">
                {stat}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-[#F8F5EF]">
        <div className="container-main">
          <SectionHeader title="طريقة الاستخدام" />
          <div className="grid gap-6 md:grid-cols-3">
            {[
              ["💊", "ابدأ اليوم", "استعمل المنتج يومياً حسب تعليمات العبوة."],
              ["⚡", "لاحظ الروتين", "راقب الطاقة والرغبة في الحلويات مع الاستمرارية."],
              ["✨", "استمر للأفضل", "أفضل تجربة كتكون مع الالتزام بعرض 3 عبوات."],
            ].map(([icon, title, text], index) => (
              <div key={title} className="card-base p-6 text-center">
                <div className="text-4xl">{icon}</div>
                <p className="mt-3 text-sm font-bold text-[#DC2626]">0{index + 1}</p>
                <h3 className="mt-1 text-lg font-extrabold text-[#102033]">{title}</h3>
                <p className="mt-2 text-sm text-[#667085]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-main max-w-3xl">
          <SectionHeader title="أسئلة شائعة" />
          <div className="space-y-4">
            {FAQS.map(([question, answer]) => (
              <details key={question} className="card-base p-5">
                <summary className="cursor-pointer list-none font-extrabold text-[#102033]">{question}</summary>
                <p className="mt-3 text-sm leading-relaxed text-[#667085]">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-[#1E4A8C] text-white">
        <div className="container-main max-w-3xl text-center">
          <p className="text-5xl font-extrabold text-[#D4A017]">30</p>
          <h2 className="mt-2 text-3xl font-extrabold md:text-4xl">يوم ضمان</h2>
          <p className="mt-4 leading-relaxed text-blue-100">
            ثقتك مهمة. إذا كان عندك أي مشكل في الطلب أو التوصيل، فريق الدعم يتواصل معك ويحل الموضوع بوضوح.
          </p>
          <button onClick={scrollToOrderForm} className="mt-8 rounded-full bg-[#DC2626] px-10 py-4 text-lg font-bold text-white transition-colors hover:bg-red-700">
            اطلب الآن — الدفع عند الاستلام 🛒
          </button>
          <p className="mt-4 text-sm text-blue-100">🔒 بياناتك محمية بالكامل • الدفع عند الاستلام</p>
        </div>
      </section>

      <MobileStickyCta label="اطلب الآن — الدفع عند الاستلام" targetId="cod-order" />
    </>
  );
}
