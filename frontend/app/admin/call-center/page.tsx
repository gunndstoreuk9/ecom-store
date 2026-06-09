"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Phone, RefreshCw, Truck } from "lucide-react";
import {
  AdminOrder,
  ApiError,
  getAdminOrders,
  updateAdminOrderCall,
} from "@/lib/api";
import { formatMad } from "@/lib/currency";
import { DELIVERY_COMPANY, DIGYLOG_CITIES } from "@/config/digylog";

type Lang = "en" | "ar";

const ADMIN_KEY_STORAGE = "tawazon_admin_key";
const LANG_STORAGE = "tawazon_admin_lang";

const CALL_STATUSES = [
  { value: "confirmed", fr: "Confirmer", ar: "مؤكد", tone: "bg-emerald-600 text-white", soft: "bg-emerald-50 text-emerald-700" },
  { value: "no_answer", fr: "Pas de réponse", ar: "لا يجيب", tone: "bg-amber-500 text-white", soft: "bg-amber-50 text-amber-700" },
  { value: "voicemail", fr: "Boîte vocale", ar: "صندوق صوتي", tone: "bg-orange-500 text-white", soft: "bg-orange-50 text-orange-700" },
  { value: "annule", fr: "Annulé", ar: "ملغى", tone: "bg-rose-600 text-white", soft: "bg-rose-50 text-rose-700", maps: "cancelled" },
  { value: "wrong_number", fr: "Numéro incorrect", ar: "رقم خاطئ", tone: "bg-red-600 text-white", soft: "bg-red-50 text-red-700" },
  { value: "busy", fr: "Occupé", ar: "مشغول", tone: "bg-yellow-500 text-white", soft: "bg-yellow-50 text-yellow-700" },
  { value: "duplicate", fr: "Commande répétée", ar: "طلب مكرر", tone: "bg-slate-600 text-white", soft: "bg-slate-100 text-slate-700" },
] as const;

// "annule" is the UI value; backend expects "cancelled".
const CALL_VALUE_TO_API: Record<string, string> = {
  annule: "cancelled",
};

const FILTERS = [
  { value: "pending", fr: "À traiter", ar: "غير متصل بهم" },
  { value: "confirmed", fr: "Confirmés", ar: "مؤكدون" },
  { value: "no_answer", fr: "Pas de réponse", ar: "لا يجيب" },
  { value: "voicemail", fr: "Boîte vocale", ar: "صندوق صوتي" },
  { value: "cancelled", fr: "Annulés", ar: "ملغون" },
  { value: "wrong_number", fr: "Num. incorrect", ar: "رقم خاطئ" },
  { value: "busy", fr: "Occupés", ar: "مشغول" },
  { value: "duplicate", fr: "Répétés", ar: "مكرر" },
] as const;

export default function CallCenterPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const [adminKey, setAdminKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState("pending");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isArabic = lang === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);
  const currentKey = savedKey || adminKey;

  useEffect(() => {
    const storedKey = window.localStorage.getItem(ADMIN_KEY_STORAGE) ?? "";
    const storedLang = window.localStorage.getItem(LANG_STORAGE);
    if (storedLang === "en" || storedLang === "ar") setLang(storedLang);
    if (storedKey) {
      setAdminKey(storedKey);
      setSavedKey(storedKey);
    }
  }, []);

  useEffect(() => {
    if (!savedKey) return;
    void loadOrders(savedKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey, filter]);

  async function loadOrders(key = currentKey) {
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminOrders(key, { limit: 200, call_status: filter, q: query });
      setOrders(result.orders);
    } catch (err) {
      setError(errorMessage(err, lang));
      if (err instanceof ApiError && err.status === 401) {
        window.localStorage.removeItem(ADMIN_KEY_STORAGE);
        setSavedKey("");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = adminKey.trim();
    if (!key) return;
    window.localStorage.setItem(ADMIN_KEY_STORAGE, key);
    setSavedKey(key);
  }

  function onSaved(updated: AdminOrder) {
    setOrders((current) => {
      // If filtering by pending, remove handled orders from the queue.
      if (filter === "pending") return current.filter((o) => o.id !== updated.id);
      return current.map((o) => (o.id === updated.id ? updated : o));
    });
  }

  if (!savedKey) {
    return (
      <section dir={isArabic ? "rtl" : "ltr"} className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0B1724] to-[#1E4A8C] px-4 py-10 text-[#102033]">
        <div className="w-full max-w-md rounded-[32px] bg-white p-7 shadow-2xl">
          <h1 className="text-2xl font-black">{t("Call Center Login", "دخول مركز الاتصال")}</h1>
          <p className="mt-2 text-sm font-semibold text-[#667085]">{t("Enter the admin key.", "دخل مفتاح الإدارة.")}</p>
          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <input
              type="password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              placeholder="ADMIN_API_KEY"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-left font-mono text-sm outline-none focus:border-[#1E4A8C]"
              dir="ltr"
            />
            <button className="w-full rounded-full bg-[#1E4A8C] px-5 py-3 text-sm font-black text-white">{t("Enter", "دخول")}</button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-[#F5F7FB] text-[#102033]">
      <header className="sticky top-0 z-40 bg-gradient-to-l from-[#0B1724] to-[#1E4A8C] text-white shadow-lg">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 transition hover:bg-white/25">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-white/70">Tawazon · {DELIVERY_COMPANY}</p>
              <h1 className="text-xl font-black">{t("Call Center", "مركز الاتصال")}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full bg-white/15 p-1">
              {(["ar", "en"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setLang(item);
                    window.localStorage.setItem(LANG_STORAGE, item);
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-black ${lang === item ? "bg-white text-[#1E4A8C]" : "text-white"}`}
                >
                  {item === "ar" ? "العربية" : "EN"}
                </button>
              ))}
            </div>
            <button onClick={() => void loadOrders()} className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black transition hover:bg-white/25">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {t("Refresh", "تحديث")}
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                filter === item.value ? "bg-[#1E4A8C] text-white" : "bg-[#F5F7FB] text-[#667085] hover:bg-[#EEF5FF]"
              }`}
            >
              {t(item.fr, item.ar)}
            </button>
          ))}
          <div className="ms-auto flex items-center gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void loadOrders();
              }}
              placeholder={t("Search...", "بحث...")}
              className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-bold outline-none focus:border-[#1E4A8C]"
            />
            <span className="rounded-full bg-[#EEF5FF] px-3 py-1.5 text-xs font-black text-[#1E4A8C]">{orders.length}</span>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6">
        {error ? <div className="mb-4 rounded-3xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {orders.map((order) => (
            <CallCard key={order.id} order={order} lang={lang} adminKey={currentKey} onSaved={onSaved} onError={(msg) => setError(msg)} />
          ))}
        </div>
        {!orders.length && !loading ? (
          <div className="flex min-h-40 items-center justify-center rounded-3xl bg-white p-8 text-center text-sm font-bold text-[#667085]">
            {t("No orders in this list.", "ماكاين حتى طلب فهاد اللائحة.")}
          </div>
        ) : null}
      </main>
    </section>
  );
}

function CallCard({
  order,
  lang,
  adminKey,
  onSaved,
  onError,
}: {
  order: AdminOrder;
  lang: Lang;
  adminKey: string;
  onSaved: (order: AdminOrder) => void;
  onError: (msg: string) => void;
}) {
  const isArabic = lang === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);
  const [disposition, setDisposition] = useState<string>("");
  const [city, setCity] = useState<string>(matchCity(order.delivery_city || order.city));
  const [note, setNote] = useState<string>(order.call_note ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const phoneDigits = useMemo(() => order.phone_e164.replace(/[^0-9]/g, ""), [order.phone_e164]);

  async function save() {
    if (!disposition || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      const apiStatus = CALL_VALUE_TO_API[disposition] ?? disposition;
      const updated = await updateAdminOrderCall(adminKey, order.id, {
        call_status: apiStatus,
        call_note: note,
        delivery_company: disposition === "confirmed" ? DELIVERY_COMPANY : undefined,
        delivery_city: disposition === "confirmed" ? city : undefined,
      });
      setSaved(true);
      onSaved(updated);
    } catch (err) {
      onError(errorMessage(err, lang));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[26px] border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-[#1E4A8C]">{order.public_order_number}</p>
          <h3 className="text-lg font-black">{order.customer_name}</h3>
          <p className="mt-1 font-mono text-sm text-[#102033]" dir="ltr">{order.phone_e164}</p>
        </div>
        <div className="text-end">
          <p className="text-lg font-black text-[#1E4A8C]">{formatMad(order.total_mad)}</p>
          <p className="text-xs font-bold text-[#667085]">x{order.hero_qty} · {order.city || t("No city", "بلا مدينة")}</p>
          {order.call_attempts ? (
            <p className="mt-1 text-xs font-black text-amber-600">{order.call_attempts} {t("attempts", "محاولات")}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <a href={`tel:${order.phone_e164}`} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#1E4A8C] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#173B70]">
          <Phone className="h-4 w-4" />
          {t("Call", "اتصل")}
        </a>
        <a
          href={`https://wa.me/${phoneDigits}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#16A34A] px-4 py-2.5 text-sm font-black text-white transition hover:bg-green-700"
        >
          WhatsApp
        </a>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-black text-[#667085]">{t("Disposition", "نتيجة المكالمة")}</p>
        <div className="flex flex-wrap gap-2">
          {CALL_STATUSES.map((item) => (
            <button
              key={item.value}
              onClick={() => setDisposition(item.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition ${disposition === item.value ? item.tone : item.soft}`}
            >
              {t(item.fr, item.ar)}
            </button>
          ))}
        </div>
      </div>

      {disposition === "confirmed" ? (
        <div className="mt-4 rounded-2xl bg-[#EEF5FF] p-4">
          <p className="mb-2 flex items-center gap-2 text-xs font-black text-[#1E4A8C]">
            <Truck className="h-4 w-4" />
            {t("Digylog delivery city", "مدينة التوصيل Digylog")}
          </p>
          <select value={city} onChange={(event) => setCity(event.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold">
            <option value="">{t("Select city", "اختر المدينة")}</option>
            {DIGYLOG_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        placeholder={t("Note (optional)", "ملاحظة (اختياري)")}
        className="mt-4 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#1E4A8C]"
      />

      <button
        onClick={() => void save()}
        disabled={!disposition || saving}
        className="mt-4 w-full rounded-full bg-[#102033] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1E4A8C] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? t("Saving...", "كيتسجل...") : saved ? t("Saved ✓", "تسجل ✓") : disposition === "confirmed" ? t("Confirm & send to Digylog", "تأكيد وإرسال لـ Digylog") : t("Save disposition", "تسجيل النتيجة")}
      </button>
    </div>
  );
}

function matchCity(value?: string | null) {
  if (!value) return "";
  const found = DIGYLOG_CITIES.find((c) => c.toLowerCase() === value.trim().toLowerCase());
  return found ?? "";
}

function errorMessage(err: unknown, lang: Lang) {
  if (err instanceof ApiError) return typeof err.message === "string" ? err.message : fallbackError(lang);
  if (err instanceof Error) return err.message;
  return fallbackError(lang);
}

function fallbackError(lang: Lang) {
  return lang === "ar" ? "تعذر حفظ نتيجة المكالمة." : "Could not save call result.";
}
