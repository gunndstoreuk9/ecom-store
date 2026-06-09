const defaultApiBase =
  process.env.NODE_ENV === "production" ? "https://api.tawazonhealth.store" : "http://localhost:8000";

export const SITE = {
  name: "تَوازُن للصحة",
  nameEn: "Tawazon Health",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://tawazonhealth.store",
  apiBase: process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBase,
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "212771436235",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "contact@tawazonhealth.store",
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "",
  tiktokPixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID ?? "",
  googleTagId: process.env.NEXT_PUBLIC_GOOGLE_TAG_ID ?? "",
  googleAdsConversionId: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID ?? "",
  googleAdsPurchaseLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL ?? "",
  defaultTitle: "تَوازُن للصحة | دعم وظيفة البنكرياس وتوازن السكر في المغرب",
  defaultDescription:
    "مكمّل غذائي أمريكي بـ20 مكوّن نشط لتحفيز ودعم وظيفة البنكرياس الطبيعية والمساعدة على توازن السكر في الدم. الدفع عند الاستلام في المغرب.",
} as const;
