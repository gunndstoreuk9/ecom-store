import { HERO_OFFERS } from "./offers";

export const HERO_PRODUCT = {
  sku: "american-sugar-balance-complex",
  slug: "balance",
  nameAr: "المركّب الأمريكي لضبط السكر — الأصلي",
  nameEn: "American Sugar Balance Complex",
  descriptionAr:
    "صيغة أمريكية متقدمة بـ20 مكوّن نشط لتحفيز ودعم وظيفة البنكرياس الطبيعية والمساعدة على توازن السكر في الدم.",
  capsules: 60,
  supplyDays: 30,
  weightMg: 940,
  heroImage: "/images/placeholders/hero-product.png",
  bottleImage: "/images/placeholders/product-bottle-front.png",
  stackImage: "/images/placeholders/product-bottle-stack-3.png",
  badges: ["GMP", "Non-GMO", "60 كبسولة", "الدفع عند الاستلام"],
  offers: HERO_OFFERS,
  ingredients: [
    {
      key: "cinnamon",
      nameAr: "القرفة",
      nameEn: "Cinnamon",
      benefitAr: "معروفة تقليدياً للمساعدة على توازن السكر في الدم بعد الوجبات.",
      image: "/images/placeholders/ingredient-cinnamon.png",
    },
    {
      key: "chromium",
      nameAr: "الكروم",
      nameEn: "Chromium",
      benefitAr: "يساعد على دعم استعمال السكر كطاقة ضمن الروتين اليومي.",
      image: "/images/placeholders/ingredient-chromium.png",
    },
    {
      key: "mulberry",
      nameAr: "التوت الأبيض",
      nameEn: "White Mulberry",
      benefitAr: "مختار للمساعدة على توازن السكر في الدم بعد الماكلة.",
      image: "/images/placeholders/ingredient-mulberry.png",
    },
    {
      key: "bitter-melon",
      nameAr: "القرع المر",
      nameEn: "Bitter Melon",
      benefitAr: "نبات معروف في تركيبات دعم وظيفة البنكرياس الطبيعية والروتين الغذائي.",
      image: "/images/placeholders/ingredient-cinnamon.png",
    },
    {
      key: "ala",
      nameAr: "حمض ألفا ليبويك",
      nameEn: "Alpha-Lipoic Acid",
      benefitAr: "مضاد أكسدة يساعد على دعم الطاقة اليومية.",
      image: "/images/placeholders/ingredient-chromium.png",
    },
    {
      key: "minerals",
      nameAr: "معادن داعمة",
      nameEn: "Zinc / Magnesium / Biotin",
      benefitAr: "عناصر مساعدة للصحة العامة والأيض.",
      image: "/images/placeholders/ingredient-mulberry.png",
    },
  ],
  compliance:
    "مكمّل غذائي، ليس دواءً. لا يقصد به تشخيص أو علاج أو شفاء أو منع أي مرض. استشر طبيبك إذا كنت تستعمل أدوية.",
} as const;
