import Link from "next/link";
import { ProductImageSlot } from "@/components/brand/ProductImageSlot";
import { HERO_PRODUCT } from "@/config/products";
import { HERO_OFFERS } from "@/config/offers";
import { formatMad } from "@/lib/currency";

const PRODUCT_URL = "/products/american-sugar-balance-complex#cod-order";

const TRUST_BADGES = ["+3,120 طلب", "GMP", "Non-GMO", "الدفع عند الاستلام"];

const STORE_PROMISES = [
  "تأكيد الطلب بالهاتف قبل الإرسال",
  "الدفع فقط عند الاستلام",
  "عرض واضح بلا مصاريف مخفية",
  "دعم واتساب للشرح والمتابعة",
];

const PROBLEM_CARDS = [
  "كتحس بالطاقة تهبط بعد الأكل؟",
  "الحلوة كتغلبك حتى مع النية؟",
  "التحاليل ولات كتقلقك؟",
  "باغي تبدأ خطوة يومية للتوازن؟",
];

const SCIENCE_CARDS = [
  {
    title: "دعم ما بعد الأكل",
    desc: "التوت الأبيض والقرع المر مدروسان لدعم استجابة الجسم بعد الوجبات.",
  },
  {
    title: "استعمال السكر كطاقة",
    desc: "القرفة والكروم وALA يساعدون في دعم أيض السكر والطاقة.",
  },
  {
    title: "تحكم أفضل في الحلويات",
    desc: "تركيبة نباتية ومعدنية تساعدك على الالتزام بروتين صحي بسهولة أكبر.",
  },
];

const REVIEWS = [
  {
    text: "طلبت عرض 3 عبوات حيث بغيت نلتزم. الدفع عند الاستلام خلاني مرتاحة.",
    author: "فاطمة",
    city: "الدار البيضاء",
  },
  {
    text: "الشرح ديال المكونات واضح، وتواصلو معايا باش يأكدو الطلب قبل الإرسال.",
    author: "مريم",
    city: "طنجة",
  },
  {
    text: "كنت كنقلب على منتج مفهوم وماشي عشوائي. عجبني أنه براند مركز على توازن السكر.",
    author: "خالد",
    city: "فاس",
  },
];

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center">
      <h2 className="text-3xl font-extrabold leading-tight text-[#102033] md:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 leading-relaxed text-[#667085]">{subtitle}</p>}
    </div>
  );
}

export default function HomePage() {
  const defaultOffer = HERO_OFFERS.find((offer) => offer.default) ?? HERO_OFFERS[2];

  return (
    <>
      <section className="bg-gradient-to-br from-[#EEF5FF] via-white to-[#F8F5EF] py-10 md:py-16">
        <div className="container-main">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                {TRUST_BADGES.map((badge) => (
                  <span key={badge} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#1E4A8C] shadow-sm">
                    {badge}
                  </span>
                ))}
              </div>

              <h1 className="text-4xl font-extrabold leading-tight text-[#102033] md:text-6xl">
                تَوازُن السكر يبدأ من دعم يومي ذكي
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-[#667085]">
                {HERO_PRODUCT.nameAr} — تركيبة أمريكية بـ20 مكوّن نشط لدعم توازن السكر في النطاق الصحي، الطاقة اليومية، والتحكم في الرغبة بالحلويات.
              </p>

              <div className="mt-5 text-sm font-bold text-yellow-500">
                ★★★★★ <span className="font-medium text-[#667085]">4.9 (1,203 تقييم) • +3,120 طلب</span>
              </div>
              <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800">
                🔥 الطلب عالي — الكمية محدودة لهذا الشهر
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href={PRODUCT_URL} className="btn-red">
                  اطلب الآن — الدفع عند الاستلام 🛒
                </Link>
                <Link href="/products/american-sugar-balance-complex" className="btn-outline">
                  شاهد التفاصيل
                </Link>
              </div>

              <p className="mt-3 text-sm font-bold text-[#DC2626]">
                عرض 3 عبوات: {formatMad(defaultOffer.priceMad)} فقط
              </p>
            </div>

            <ProductImageSlot
              label="صورة الهيرو: المنتج + عرض 3 عبوات"
              filename="hero-bundle.webp"
              note="صورة المنتج الرئيسية مع شارات الثقة والدفع عند الاستلام."
            />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STORE_PROMISES.map((promise) => (
              <div key={promise} className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-bold text-[#102033] shadow-sm">
                ✅ {promise}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-[#F8F5EF]">
        <div className="container-main">
          <SectionHeader
            title="المشكلة ماشي دائماً ضعف إرادة"
            subtitle="عندما لا يستعمل الجسم السكر بكفاءة، كتبدأ حلقة التعب، الرغبة في الحلويات، والقلق من التحاليل."
          />
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <ProductImageSlot
              label="صورة الألم والرغبة في الحلويات"
              filename="problem-cravings.webp"
              note="تعب بعد الأكل، حلويات، وقلق التحاليل."
              tone="sand"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {PROBLEM_CARDS.map((card) => (
                <div key={card} className="rounded-3xl bg-white p-6 text-center shadow-sm">
                  <div className="mb-3 text-3xl">😔</div>
                  <p className="font-bold text-[#102033]">{card}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-[#1E4A8C]">
        <div className="container-main">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <ProductImageSlot
              label="صورة الميكانيزم العلمي"
              filename="ingredients-science.webp"
              note="مناسبة لشرح 20 مكوّن وكيفاش كيدعمو الطاقة والتوازن."
              tone="green"
            />
            <div>
              <h2 className="text-3xl font-extrabold text-white md:text-4xl">مصفوفة تَوازُن الثلاثية</h2>
              <p className="mt-3 text-blue-100">20 مكوّن، هدف واحد: دعم التوازن اليومي.</p>
              <div className="mt-8 grid gap-5">
                {SCIENCE_CARDS.map((card, index) => (
                  <div key={card.title} className="rounded-3xl border border-white/20 bg-white/10 p-6 text-white backdrop-blur">
                    <p className="mb-2 text-sm font-bold text-[#D4A017]">0{index + 1}</p>
                    <h3 className="text-lg font-extrabold">{card.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-blue-100">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-main">
          <SectionHeader title="المكونات الفعّالة" subtitle="تركيبة مدروسة — كل مكون له دور محدد في دعم التوازن والطاقة." />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {HERO_PRODUCT.ingredients.map((ing) => (
              <div key={ing.key} className="card-base p-5 transition-shadow hover:shadow-md">
                <div className="mb-3 text-2xl">✅</div>
                <h3 className="font-extrabold text-[#102033]">{ing.nameAr}</h3>
                <p className="text-xs text-[#667085]">{ing.nameEn}</p>
                <p className="mt-2 text-xs leading-relaxed text-[#667085]">{ing.benefitAr}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-[#F8F5EF]">
        <div className="container-main">
          <SectionHeader title="+1,203 عميل يثق بتَوازُن" subtitle="آراء وتجربة شراء مبنية على الوضوح، الدفع عند الاستلام، والتأكيد الهاتفي." />
          <div className="grid gap-6 md:grid-cols-3">
            {REVIEWS.map((review) => (
              <div key={`${review.author}-${review.city}`} className="card-base p-6">
                <div className="mb-3 text-yellow-400">★★★★★</div>
                <p className="text-sm leading-relaxed text-[#102033]">&ldquo;{review.text}&rdquo;</p>
                <p className="mt-4 text-xs font-bold text-[#667085]">{review.author} — {review.city}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-main">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-3xl font-extrabold text-[#102033] md:text-4xl">جاهز تبدأ؟</h2>
              <p className="mt-3 leading-relaxed text-[#667085]">
                اختار العرض المناسب، دخل معلوماتك، وفريقنا يتصل بك لتأكيد الطلب قبل الإرسال. الدفع فقط عند الاستلام.
              </p>
              <div className="mt-6 space-y-3">
                {HERO_OFFERS.map((offer) => (
                  <Link
                    key={offer.id}
                    href={PRODUCT_URL}
                    className={`block rounded-2xl border-2 p-5 transition-all ${
                      offer.default ? "border-[#1E4A8C] bg-[#EEF5FF] shadow-md" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-extrabold text-[#102033]">{offer.label}</p>
                        <p className="text-xs text-[#667085]">{offer.qty} عبوة</p>
                      </div>
                      <div className="text-left">
                        <p className="text-xl font-extrabold text-[#DC2626]">{formatMad(offer.priceMad)}</p>
                        {offer.savings && <p className="text-xs font-bold text-[#16A34A]">{offer.savings}</p>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <Link href={PRODUCT_URL} className="btn-red mt-6 w-full">
                إختر العرض وأرسل الطلب
              </Link>
            </div>
            <ProductImageSlot
              label="صورة الثقة والعرض"
              filename="cod-proof-offer.webp"
              note="منتج، توصيل، COD، واتساب، ونجوم ثقة."
              tone="gold"
            />
          </div>
        </div>
      </section>
    </>
  );
}
