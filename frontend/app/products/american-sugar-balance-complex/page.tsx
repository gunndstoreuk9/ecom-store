"use client";

import Image from "next/image";
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
    icon: "🍽️",
    title: "بعد الوجبات",
    text: "مكوّنات بحال القرفة والتوت الأبيض مختارة باش تدعم روتينك اليومي بعد الماكلة.",
    point: "مهم للناس اللي كيحسو بثقل أو تعب بعد الوجبات.",
  },
  {
    icon: "⚡",
    title: "الطاقة خلال النهار",
    text: "الكروم والمعادن الداعمة كيساعدو الجسم فالأيض الطبيعي للمغذيات واستعمال الطاقة بشكل أفضل.",
    point: "روتين بسيط للناس اللي كيبغيو نهارهم يكون منظم.",
  },
  {
    icon: "🍬",
    title: "الرغبة فالحلويات",
    text: "تركيبة نباتية ومعدنية كتخليك مركز على الالتزام اليومي بدل ما تبقى كل مرة كتقاوم بوحدك.",
    point: "كيعاونك تبني عادة يومية واضحة بلا تعقيد.",
  },
];

const STATS = [
  { value: "20", label: "مكوّن نشط", sublabel: "تركيبة نباتية ومعدنية" },
  { value: "60", label: "كبسولة", sublabel: "علبة كاملة للروتين اليومي" },
  { value: "940mg", label: "لكل حصة", sublabel: "كما هو موضح على العبوة" },
];

const SCIENCE_PILLARS = [
  "قرفة + كروم + توت أبيض",
  "تركيبة واضحة ماشي منتج مجهول",
  "روتين يومي مفهوم وسهل الالتزام",
  "دفع عند الاستلام قبل أي مخاطرة",
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
    image: "review-bottle-1.png",
    title: "وصلني نفس المنتج اللي فالصور",
    text: "كنت مترددة شوية حيث أول مرة كنطلب من موقع، ولكن عجبني أنهم عيطو ليا أكدو الطلب والثمن قبل الإرسال. العلبة وصلاتني مغلفة ومكتوب عليها نفس التفاصيل.",
    result: "طلب مؤكد بالهاتف",
    author: "نادية",
    city: "الدار البيضاء",
  },
  {
    image: "review-bottle-2.png",
    title: "خديت عرض 3 عبوات باش نكمل الروتين",
    text: "الشرح كان واضح، وعرض 3 عبوات خرج ليا بثمن مزيان. أهم حاجة عندي هي الدفع عند الاستلام، ماخلصت والو حتى وصلني الطلب.",
    result: "أفضل قيمة",
    author: "سميرة",
    city: "مراكش",
  },
  {
    image: "review-bottle-3.png",
    title: "واضح وساهل فالاستعمال اليومي",
    text: "كنت باغي شي حاجة مفهومة بلا تعقيد. عجبني أن الصفحة شارحة المكونات، والفريق شرح ليا طريقة الاستعمال فالمكالمة قبل الشحن.",
    result: "استعمال بسيط",
    author: "يونس",
    city: "أكادير",
  },
  {
    image: "review-bottle-4.png",
    title: "خدمة منظمة وماكاين حتى دفع مسبق",
    text: "دخلت الاسم والتلفون والمدينة، من بعد عيطو ليا للتأكيد. عجبني أن الثمن بقى هو هو، والتوصيل كان واضح من الأول.",
    result: "تجربة مطمئنة",
    author: "رشيد",
    city: "الرباط",
  },
  {
    image: "review-capsules.png",
    title: "الكبسولات والعلبة باينين بجودة مزيانة",
    text: "صورت الكبسولات باش نشارك التجربة. بالنسبة ليا المهم هو نلتزم بالروتين اليومي، والعلبة فيها 60 كبسولة كما مكتوب فالصفحة.",
    result: "60 كبسولة",
    author: "خديجة",
    city: "فاس",
  },
  {
    image: "review-bottle-5.png",
    title: "طلب واضح وتأكيد سريع",
    text: "الطلب كان ساهل بزاف، ماحتاجيتش بطاقة بنكية. دخلت المعلومات، جا التأكيد، ومن بعد وصلني المنتج حتى للدار.",
    result: "COD حتى للدار",
    author: "حمزة",
    city: "طنجة",
  },
];

const FAQS = [
  ["واش خاصني نخلص قبل ما يوصلني الطلب؟", "لا. الطلب بالدفع عند الاستلام. كتدخل الاسم، الهاتف والمدينة، والفريق كيتاصل بك للتأكيد، وكتخلص غير ملي يوصلك المنتج."],
  ["كيفاش كنعرف أن الطلب ديالي تسجل؟", "منين كتضغط على تأكيد الطلب، كيتسجل الطلب عندنا وكيبقى الفريق يتاصل بك باش يأكد العرض، المدينة، والثمن النهائي قبل الإرسال."],
  ["شحال من كبسولة فالعلبة؟", "كل علبة فيها 60 كبسولة. الاستعمال اليومي بسيط ومصمم باش يدخل فالروتين بلا تعقيد."],
  ["شنو العرض اللي كيناسبني؟", "إلى بغيتي أفضل قيمة واستمرارية، عرض 3 عبوات هو الأكثر طلباً. إلى بغيتي غير تجربة أولى، تقدر تبدأ بعبوة واحدة."],
  ["واش الثمن كيتبدل من بعد الطلب؟", "لا. الثمن اللي كتشوف فالفورم هو نفس الثمن اللي كيتأكد معاك فالمكالمة، بلا مفاجآت وبلا دفع مسبق."],
  ["واش كتوصلو لجميع المدن؟", "نعم، كنوصلو لجميع مدن المغرب. دخل المدينة ديالك فالفورم والفريق كيتاصل بك باش يأكد تفاصيل التوصيل."],
  ["كيفاش نستعملو يومياً؟", "خليه روتين بسيط: كبسولتين يومياً مع كاس ماء، والأفضل بعد الوجبات الرئيسية وبنفس الوقت تقريباً كل نهار."],
  ["إلى كان عندي سؤال قبل الطلب؟", "تقدر تطلب عادي، والفريق كيشرح لك التفاصيل فمكالمة التأكيد قبل ما يتجهز الطلب للإرسال."],
];

function scrollToOrderForm() {
  document.getElementById("cod-order")?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const onSubmit = async (data: OrderFormData) => {
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
        sku: HERO_PRODUCT.sku,
        event_id: eventId,
      });

      trackLead({ value: selectedOffer.priceMad, eventId });
      router.push(`/thank-you?order_id=${order.order_id}`);
    } catch (error) {
      console.error("Order creation failed", error);
      setSubmitError("تعذر إرسال الطلب. تأكد من الاتصال أو جرب مرة أخرى بعد لحظات.");
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
                <p className="text-sm font-extrabold text-[#102033]">اختر العرض المناسب:</p>
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
              {submitError && (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold text-[#B91C1C]">
                  {submitError}
                </p>
              )}

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
              <div className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-white via-[#F8FBFF] to-[#EEF5FF] p-2 shadow-2xl ring-1 ring-[#D7E4F5] sm:p-3">
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#205081]/10 blur-3xl" />
                <div className="absolute -bottom-20 left-8 h-48 w-48 rounded-full bg-[#DC2626]/10 blur-3xl" />
                <div className="relative aspect-square overflow-hidden rounded-[28px] bg-white">
                  <Image
                    src="/images/product-page/hero-bundle.webp"
                    alt="المكمل الأمريكي لضبط السكر"
                    fill
                    sizes="(min-width: 1024px) 560px, 100vw"
                    className="object-cover"
                    priority
                  />
                </div>
              </div>

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
              className="min-h-[320px] md:min-h-[420px]"
              showImage
              imageFit="cover"
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
          <div className="mb-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <p className="mb-2 text-sm font-black text-[#DC2626]">الإثبات العلمي</p>
              <h2 className="max-w-3xl text-3xl font-black leading-tight text-[#102033] md:text-5xl">
                ماشي غير كلام تسويقي: التركيبة مبنية على مكوّنات معروفة لدعم التوازن اليومي
              </h2>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-[#667085]">
                الفكرة بسيطة ومفهومة للعميل المغربي: دعم يومي لثلاث نقاط كتهم بزاف الناس بعد الأكل، الطاقة، والرغبة فالحلويات، مع استعمال سهل ودفع عند الاستلام.
              </p>
            </div>

            <div className="rounded-[30px] border border-[#D7E4F5] bg-gradient-to-br from-[#EEF5FF] to-white p-5 shadow-sm">
              <p className="text-sm font-black text-[#1E4A8C]">شنو كيميز هاد التركيبة؟</p>
              <div className="mt-4 grid gap-3">
                {SCIENCE_PILLARS.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#102033] shadow-sm">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#16A34A] text-xs text-white">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[36px] border border-gray-100 bg-[#F8F5EF] shadow-2xl shadow-slate-900/5">
            <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="relative min-h-[360px] bg-[#EEF5FF] lg:min-h-full">
                <Image
                  src="/images/product-page/ingredients-science.webp"
                  alt="مكونات المركب الأمريكي لضبط السكر"
                  fill
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#102033]/55 via-transparent to-transparent" />
                <div className="absolute bottom-5 right-5 rounded-3xl bg-white/95 p-4 text-right shadow-xl">
                  <p className="text-xs font-bold text-[#667085]">تركيبة واضحة</p>
                  <p className="mt-1 text-lg font-black text-[#102033]">20 مكوّن نشط</p>
                  <p className="text-xs font-bold text-[#1E4A8C]">قرفة · كروم · توت أبيض · معادن داعمة</p>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:p-8">
                {PROOF_STAGES.map((stage, index) => (
                  <div key={stage.title} className="rounded-[28px] bg-white p-5 shadow-sm">
                    <div className="flex gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#EEF5FF] text-3xl">
                        {stage.icon}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#1E4A8C] px-3 py-1 text-xs font-black text-white">
                            مسار {index + 1}
                          </span>
                          <h3 className="text-xl font-black text-[#102033]">{stage.title}</h3>
                        </div>
                        <p className="mt-3 text-sm font-semibold leading-7 text-[#475467]">{stage.text}</p>
                        <p className="mt-3 rounded-2xl bg-[#F0FDF4] px-4 py-3 text-sm font-black text-[#168A12]">
                          {stage.point}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STATS.map((stat) => (
              <div key={stat.label} className="rounded-[28px] border border-[#D7E4F5] bg-white p-6 text-center shadow-sm">
                <p className="text-4xl font-black text-[#1E4A8C]">{stat.value}</p>
                <p className="mt-2 text-sm font-black text-[#102033]">{stat.label}</p>
                <p className="mt-1 text-xs font-semibold text-[#667085]">{stat.sublabel}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-8 max-w-4xl rounded-[28px] bg-[#102033] p-5 text-center text-white md:p-7">
            <p className="text-xl font-black md:text-2xl">بغيتي تركيبة مفهومة وثمن واضح بلا دفع مسبق؟</p>
            <p className="mt-2 text-sm font-semibold leading-7 text-blue-100">
              اختار العرض المناسب، دخل معلوماتك، والفريق يتاصل بك للتأكيد قبل الإرسال.
            </p>
            <button onClick={scrollToOrderForm} className="mt-5 rounded-full bg-[#DC2626] px-8 py-4 text-sm font-black text-white transition hover:bg-red-700">
              اطلب الآن — الدفع عند الاستلام
            </button>
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
              className="min-h-[320px] md:min-h-[420px]"
              showImage
              imageFit="cover"
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
          <SectionHeader title="علاش المكمل الأمريكي لضبط السكر يختلف؟" subtitle="مقارنة واضحة بين براند متخصص ومنتجات عامة." />
          <div className="overflow-hidden rounded-3xl border border-gray-200 shadow-sm">
            <div className="grid grid-cols-3 bg-[#1E4A8C] text-sm font-bold text-white">
              <div className="p-4">المعيار</div>
              <div className="p-4 text-center">المكمل الأمريكي لضبط السكر</div>
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
              className="min-h-[320px] md:min-h-[420px]"
              showImage
              imageFit="cover"
            />
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-main">
          <SectionHeader
            kicker="تجارب مصورة من العملاء"
            title="عملاء مغاربة طلبو المنتج وتوصّلوا به حتى للدار"
            subtitle="صور واقعية من العملاء، طلب واضح، تأكيد بالهاتف، والدفع فقط عند الاستلام."
          />

          <div className="mb-8 grid gap-4 rounded-[32px] border border-[#D7E4F5] bg-gradient-to-br from-[#EEF5FF] via-white to-[#F8F5EF] p-4 shadow-sm md:grid-cols-3 md:p-6">
            {[
              ["4.9/5", "تقييم تجربة الطلب"],
              ["+3,120", "طلب مؤكد"],
              ["COD", "الدفع عند الاستلام"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-3xl bg-white p-5 text-center shadow-sm">
                <p className="text-3xl font-black text-[#1E4A8C]">{value}</p>
                <p className="mt-1 text-sm font-extrabold text-[#102033]">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {REVIEWS.map((review, index) => (
              <article
                key={`${review.author}-${review.city}`}
                className={`group overflow-hidden rounded-[30px] border border-gray-100 bg-white shadow-lg shadow-slate-900/5 transition hover:-translate-y-1 hover:shadow-2xl ${
                  index === 0 ? "md:col-span-2 lg:col-span-1" : ""
                }`}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-[#EEF5FF]">
                  <Image
                    src={`/images/product-page/${review.image}`}
                    alt={`${review.title} - ${review.author} من ${review.city}`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-[#16A34A] shadow-sm">
                    صورة عميل حقيقية
                  </div>
                  <div className="absolute bottom-3 left-3 rounded-full bg-[#102033]/90 px-3 py-1 text-xs font-bold text-white">
                    {review.city}
                  </div>
                </div>

                <div className="p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-yellow-400">★★★★★</span>
                    <span className="rounded-full bg-[#F0FDF4] px-3 py-1 text-xs font-black text-[#168A12]">
                      {review.result}
                    </span>
                  </div>
                  <h3 className="text-lg font-black leading-tight text-[#102033]">{review.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-7 text-[#475467]">&ldquo;{review.text}&rdquo;</p>
                  <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                    <p className="text-sm font-black text-[#102033]">{review.author}</p>
                    <p className="text-xs font-bold text-[#667085]">طلب مؤكد</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-3xl rounded-[28px] bg-[#102033] p-5 text-center text-white shadow-2xl md:p-7">
            <p className="text-lg font-black md:text-2xl">بغيتي تطلب بلا مخاطرة؟ خلص حتى يوصلك المنتج.</p>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              دخل الاسم، الهاتف والمدينة. الفريق كيتاصل بك للتأكيد قبل الإرسال، والثمن النهائي كيبقى واضح.
            </p>
            <button onClick={scrollToOrderForm} className="mt-5 rounded-full bg-[#DC2626] px-8 py-3 text-sm font-black text-white transition hover:bg-red-700">
              اطلب الآن بالدفع عند الاستلام
            </button>
          </div>
        </div>
      </section>

      <section className="section-padding bg-[#F8F5EF]">
        <div className="container-main">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="relative overflow-hidden rounded-[34px] bg-white p-3 shadow-2xl ring-1 ring-[#E6DCCB]">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[26px]">
                <Image
                  src="/images/product-page/how-to-use-woman-capsule.png"
                  alt="طريقة استعمال المكمل الأمريكي لضبط السكر"
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute bottom-6 right-6 rounded-2xl bg-white/95 px-4 py-3 text-right shadow-lg">
                <p className="text-xs font-bold text-[#667085]">روتين يومي بسيط</p>
                <p className="text-sm font-black text-[#102033]">كبسولات + ماء + استمرار</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-black text-[#DC2626]">طريقة الاستعمال</p>
              <h2 className="text-3xl font-black leading-tight text-[#102033] md:text-4xl">
                كيفاش تستعملو بطريقة سهلة باش يبقى الروتين واضح؟
              </h2>
              <p className="mt-4 text-base font-semibold leading-8 text-[#667085]">
                السر ماشي فالتعقيد. خليه عادة يومية بسيطة: بعد الوجبات الرئيسية، مع كاس ديال الماء، وبنفس الوقت تقريباً كل نهار.
              </p>

              <div className="mt-7 space-y-4">
                {[
                  ["1", "خد كبسولتين يومياً", "استعمل الكمية اليومية كما موضحة على العبوة، وخليها جزء من الروتين ديالك."],
                  ["2", "الأفضل بعد الوجبات الرئيسية", "باش يكون الاستعمال منظم وسهل التذكر، خدو بعد الماكلة ماشي على معدة خاوية."],
                  ["3", "شرب معاه كاس ماء", "الماء كيساعدك تبلع الكبسولات بسهولة ويخلي التجربة مريحة."],
                  ["4", "استمر يومياً بلا تقطاع", "النتائج المرتبطة بالروتين كتحتاج الاستمرارية. خليه قدامك باش ماتنساهش."],
                ].map(([step, title, text]) => (
                  <div key={step} className="flex gap-4 rounded-3xl bg-white p-4 shadow-sm">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1E4A8C] text-lg font-black text-white">
                      {step}
                    </span>
                    <div>
                      <h3 className="text-lg font-black text-[#102033]">{title}</h3>
                      <p className="mt-1 text-sm font-semibold leading-7 text-[#667085]">{text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {["سهل التذكر", "مناسب للروتين اليومي", "60 كبسولة فالعلبة"].map((benefit) => (
                  <div key={benefit} className="rounded-2xl bg-[#EEF5FF] px-4 py-3 text-center text-sm font-black text-[#1E4A8C]">
                    ✓ {benefit}
                  </div>
                ))}
              </div>

              <button onClick={scrollToOrderForm} className="mt-7 w-full rounded-full bg-[#DC2626] px-8 py-4 text-base font-black text-white shadow-lg shadow-red-900/20 transition hover:bg-red-700 sm:w-auto">
                بغيت نطلب ونبدأ الروتين
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-main">
          <SectionHeader
            kicker="قبل ما تطلب"
            title="أسئلة شائعة كتجاوب على أي تردد قبل الطلب"
            subtitle="وضحنا لك أهم التفاصيل: الدفع، التوصيل، طريقة التأكيد، والعرض المناسب."
          />

          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div className="sticky top-24 rounded-[32px] bg-gradient-to-br from-[#102033] to-[#1E4A8C] p-6 text-white shadow-2xl">
              <p className="text-sm font-black text-[#FDE68A]">ثقة قبل الطلب</p>
              <h3 className="mt-2 text-3xl font-black leading-tight">كلشي واضح قبل ما يخرج الطلب من عندنا</h3>
              <p className="mt-4 text-sm font-semibold leading-7 text-blue-100">
                ماكاين لا دفع مسبق لا مفاجآت فالثمن. كنديرو تأكيد بالهاتف باش تعرف شنو طلبتي، شحال غادي تخلص، وفين غادي توصلك الشحنة.
              </p>
              <div className="mt-6 grid gap-3">
                {["الدفع عند الاستلام", "تأكيد الطلب بالهاتف", "ثمن واضح قبل الإرسال"].map((item) => (
                  <div key={item} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black">
                    ✓ {item}
                  </div>
                ))}
              </div>
              <button onClick={scrollToOrderForm} className="mt-6 w-full rounded-full bg-[#DC2626] px-6 py-3 text-sm font-black text-white transition hover:bg-red-700">
                طلب آمن بالدفع عند الاستلام
              </button>
            </div>

            <div className="space-y-4">
              {FAQS.map(([question, answer], index) => (
                <details
                  key={question}
                  open={index === 0}
                  className="group rounded-[26px] border border-gray-100 bg-white p-5 shadow-sm transition hover:border-[#D7E4F5] hover:shadow-lg"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <span className="text-base font-black leading-7 text-[#102033] md:text-lg">{question}</span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF5FF] text-xl font-black text-[#1E4A8C] transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 border-t border-gray-100 pt-4 text-sm font-semibold leading-7 text-[#667085]">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-[#102033] text-white">
        <div className="container-main">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#1E4A8C] via-[#102033] to-[#0B1724] p-8 shadow-2xl">
              <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-[#D4A017]/20 blur-3xl" />
              <div className="absolute -bottom-24 right-10 h-64 w-64 rounded-full bg-[#DC2626]/20 blur-3xl" />
              <div className="relative z-10 text-center">
                <p className="text-sm font-black text-[#FDE68A]">ضمان وراحة بال</p>
                <div className="mx-auto mt-5 flex h-40 w-40 items-center justify-center rounded-full border-8 border-[#D4A017]/40 bg-white text-[#102033] shadow-2xl">
                  <div>
                    <p className="text-6xl font-black leading-none">30</p>
                    <p className="text-sm font-black">يوم</p>
                  </div>
                </div>
                <h2 className="mt-6 text-3xl font-black md:text-4xl">30 يوم ضمان</h2>
                <p className="mx-auto mt-4 max-w-md text-sm font-semibold leading-7 text-blue-100">
                  طلبك خاصو يكون واضح ومريح. إذا كان عندك أي مشكل فالتوصيل، التغليف، أو تفاصيل الطلب، فريق الدعم كيتواصل معاك وكيحل الموضوع بوضوح.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-3xl font-black leading-tight md:text-4xl">
                علاش تقدر تطلب بلا تردد؟
              </h3>
              <p className="mt-4 text-base font-semibold leading-8 text-blue-100">
                العميل المغربي كيبغي الثقة قبل كلشي. لذلك خلينا الطلب بسيط: كتأكد بالهاتف، كتخلص حتى يوصلك، وعندك دعم واضح بعد الطلب.
              </p>

              <div className="mt-7 grid gap-4 md:grid-cols-3">
                {[
                  ["1", "كتأكد قبل الإرسال", "كنعيطو لك باش نراجعو العرض والمدينة والثمن النهائي."],
                  ["2", "كتخلص حتى يوصلك", "ماكاين حتى دفع مسبق. الأداء كيكون عند الاستلام."],
                  ["3", "دعم بعد الطلب", "إلى وقع أي مشكل، كاين فريق يتابع معاك بوضوح."],
                ].map(([number, title, text]) => (
                  <div key={number} className="rounded-[28px] bg-white/10 p-5 backdrop-blur">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D4A017] text-lg font-black text-[#102033]">
                      {number}
                    </span>
                    <h4 className="mt-4 text-lg font-black">{title}</h4>
                    <p className="mt-2 text-sm font-semibold leading-7 text-blue-100">{text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-7 rounded-[28px] border border-white/15 bg-white/10 p-5">
                <p className="text-lg font-black">الخطوة الوحيدة دابا: دخل معلوماتك وخلي الفريق يأكد معاك.</p>
                <p className="mt-2 text-sm font-semibold leading-7 text-blue-100">
                  الاسم، الهاتف، والمدينة كافيين باش نسجلو الطلب ونتواصلو معاك قبل الإرسال.
                </p>
                <button onClick={scrollToOrderForm} className="mt-5 rounded-full bg-[#DC2626] px-8 py-4 text-sm font-black text-white shadow-lg shadow-red-950/30 transition hover:bg-red-700">
                  اطلب الآن — الدفع عند الاستلام
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MobileStickyCta label="اطلب الآن — الدفع عند الاستلام" targetId="cod-order" />
    </>
  );
}
