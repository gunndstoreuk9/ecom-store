"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Phone, RefreshCw, Truck, Download, Send, BarChart3 } from "lucide-react";
import {
  AdminCallCenterStats,
  AdminOrder,
  ApiError,
  dispatchOrders,
  editAdminOrder,
  getAdminOrders,
  getCallCenterStats,
  updateAdminOrderCall,
} from "@/lib/api";
import { formatMad } from "@/lib/currency";
import { DELIVERY_COMPANY, DIGYLOG_CITIES } from "@/config/digylog";
import { HERO_OFFERS } from "@/config/offers";

type Lang = "en" | "ar";

const ADMIN_KEY_STORAGE = "tawazon_admin_key";
const LANG_STORAGE = "tawazon_admin_lang";

const CALL_STATUSES = [
  { value: "confirmed", fr: "Confirmer", ar: "مؤكد", tone: "bg-emerald-600 text-white", soft: "bg-emerald-50 text-emerald-700" },
  { value: "no_answer", fr: "Pas de réponse", ar: "لا يجيب", tone: "bg-amber-500 text-white", soft: "bg-amber-50 text-amber-700" },
  { value: "voicemail", fr: "Boîte vocale", ar: "صندوق صوتي", tone: "bg-orange-500 text-white", soft: "bg-orange-50 text-orange-700" },
  { value: "annule", fr: "Annulé", ar: "ملغى", tone: "bg-rose-600 text-white", soft: "bg-rose-50 text-rose-700" },
  { value: "wrong_number", fr: "Numéro incorrect", ar: "رقم خاطئ", tone: "bg-red-600 text-white", soft: "bg-red-50 text-red-700" },
  { value: "busy", fr: "Occupé", ar: "مشغول", tone: "bg-yellow-500 text-white", soft: "bg-yellow-50 text-yellow-700" },
  { value: "duplicate", fr: "Commande répétée", ar: "طلب مكرر", tone: "bg-slate-600 text-white", soft: "bg-slate-100 text-slate-700" },
] as const;

// "annule" is the UI value; backend expects "cancelled".
const CALL_VALUE_TO_API: Record<string, string> = {
  annule: "cancelled",
};

type TabValue = "new" | "follow_up" | "confirmed" | "all";

const TABS: { value: TabValue; fr: string; ar: string }[] = [
  { value: "new", fr: "Nouvelles", ar: "طلبات جديدة" },
  { value: "follow_up", fr: "À relancer", ar: "للمتابعة" },
  { value: "confirmed", fr: "À expédier", ar: "للإرسال" },
  { value: "all", fr: "Toutes", ar: "الكل" },
];

export default function CallCenterPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const [adminKey, setAdminKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [stats, setStats] = useState<AdminCallCenterStats | null>(null);
  const [showStats, setShowStats] = useState(true);
  const [tab, setTab] = useState<TabValue>("new");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey, tab]);

  useEffect(() => {
    if (!savedKey) return;
    void loadStats(savedKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  async function loadOrders(key = currentKey) {
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      const params: { limit: number; q: string; bucket?: string } = { limit: 300, q: query };
      if (tab !== "all") params.bucket = tab;
      const result = await getAdminOrders(key, params);
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

  async function loadStats(key = currentKey) {
    if (!key) return;
    try {
      setStats(await getCallCenterStats(key));
    } catch {
      // stats are non-blocking
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
    void loadStats();
    setOrders((current) => {
      // In contact queues a handled order leaves the list once it changes state.
      if ((tab === "new" || tab === "follow_up") && updated.status !== "new") {
        return current.filter((o) => o.id !== updated.id);
      }
      return current.map((o) => (o.id === updated.id ? updated : o));
    });
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function sendToDelivery() {
    const ids = orders.filter((o) => selected.has(o.id)).map((o) => o.id);
    if (!ids.length) return;
    setLoading(true);
    setError(null);
    try {
      await dispatchOrders(currentKey, ids, DELIVERY_COMPANY);
      setOrders((current) => current.filter((o) => !selected.has(o.id)));
      setSelected(new Set());
      void loadStats();
    } catch (err) {
      setError(errorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    const rows = orders.filter((o) => selected.size === 0 || selected.has(o.id));
    if (!rows.length) return;
    const header = ["Product", "Quantity", "Customer", "Phone", "Address", "City", "Price", "Commentaire"];
    const lines = rows.map((o) => {
      const product = o.items?.[0]?.name_ar ?? o.hero_sku;
      const city = o.delivery_city || o.city || "";
      return [product, o.hero_qty, o.customer_name, o.phone_e164, o.address || "", city, o.total_mad, o.call_note || ""]
        .map(csvCell)
        .join(",");
    });
    const csv = "\uFEFF" + [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `digylog-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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

  const isDispatch = tab === "confirmed";

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
            <button
              onClick={() => setShowStats((v) => !v)}
              className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black transition hover:bg-white/25"
            >
              <BarChart3 className="h-4 w-4" />
              {t("Rates", "النسب")}
            </button>
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

      {showStats && stats ? <StatsPanel stats={stats} lang={lang} /> : null}

      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          {TABS.map((item) => (
            <button
              key={item.value}
              onClick={() => setTab(item.value)}
              className={`rounded-full px-4 py-1.5 text-xs font-black transition ${
                tab === item.value ? "bg-[#1E4A8C] text-white" : "bg-[#F5F7FB] text-[#667085] hover:bg-[#EEF5FF]"
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

      {isDispatch ? (
        <div className="border-b border-gray-200 bg-[#EEF5FF]">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <span className="text-xs font-black text-[#1E4A8C]">
              {t(`${selected.size} selected`, `${selected.size} مختار`)}
            </span>
            <button
              onClick={() => setSelected(selected.size === orders.length ? new Set() : new Set(orders.map((o) => o.id)))}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#1E4A8C]"
            >
              {selected.size === orders.length && orders.length ? t("Clear", "إلغاء التحديد") : t("Select all", "تحديد الكل")}
            </button>
            <button onClick={exportCsv} className="flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-black text-[#102033]">
              <Download className="h-4 w-4" />
              {t("Export CSV", "تصدير CSV")}
            </button>
            <button
              onClick={() => void sendToDelivery()}
              disabled={!selected.size || loading}
              className="flex items-center gap-2 rounded-full bg-[#16A34A] px-4 py-1.5 text-xs font-black text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {t(`Send to ${DELIVERY_COMPANY}`, `إرسال إلى ${DELIVERY_COMPANY}`)}
            </button>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6">
        {error ? <div className="mb-4 rounded-3xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {orders.map((order) => (
            <CallCard
              key={order.id}
              order={order}
              lang={lang}
              adminKey={currentKey}
              dispatchMode={isDispatch}
              selected={selected.has(order.id)}
              onToggleSelect={() => toggleSelected(order.id)}
              onSaved={onSaved}
              onError={(msg) => setError(msg)}
            />
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

function StatsPanel({ stats, lang }: { stats: AdminCallCenterStats; lang: Lang }) {
  const isArabic = lang === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);
  const offerLabel = (qty: number) => HERO_OFFERS.find((o) => o.qty === qty)?.sublabel ?? `${qty}`;
  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-[1280px] px-4 py-4 sm:px-6">
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-[#667085]">{t("Confirmation rate by period", "نسبة التأكيد حسب الفترة")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {stats.by_period.map((p) => (
            <div key={p.key} className="rounded-2xl border border-gray-100 bg-[#F8FAFD] p-3 text-center">
              <p className="text-[10px] font-black uppercase text-[#667085]">{t(p.label, periodAr(p.key))}</p>
              <p className="mt-1 text-lg font-black text-[#1E4A8C]">{p.rate}%</p>
              <p className="text-[10px] font-bold text-[#94A3B8]">{p.confirmed}/{p.total}</p>
            </div>
          ))}
        </div>
        {stats.by_offer.length ? (
          <>
            <p className="mb-2 mt-4 text-xs font-black uppercase tracking-wide text-[#667085]">{t("Confirmation rate by offer", "نسبة التأكيد حسب العرض")}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {stats.by_offer.map((o) => (
                <div key={o.offer_id} className="rounded-2xl border border-gray-100 bg-[#F8FAFD] p-3 text-center">
                  <p className="text-[10px] font-black uppercase text-[#667085]">{offerLabel(o.qty)}</p>
                  <p className="mt-1 text-lg font-black text-emerald-600">{o.rate}%</p>
                  <p className="text-[10px] font-bold text-[#94A3B8]">{o.confirmed}/{o.total}</p>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function CallCard({
  order,
  lang,
  adminKey,
  dispatchMode,
  selected,
  onToggleSelect,
  onSaved,
  onError,
}: {
  order: AdminOrder;
  lang: Lang;
  adminKey: string;
  dispatchMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onSaved: (order: AdminOrder) => void;
  onError: (msg: string) => void;
}) {
  const isArabic = lang === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);
  const [disposition, setDisposition] = useState<string>("");
  const [name, setName] = useState<string>(order.customer_name);
  const [qty, setQty] = useState<number>(order.hero_qty);
  const [total, setTotal] = useState<number>(order.total_mad);
  const [address, setAddress] = useState<string>(order.address ?? "");
  const [city, setCity] = useState<string>(matchCity(order.delivery_city || order.city));
  const [note, setNote] = useState<string>(order.call_note ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const phoneDigits = useMemo(() => order.phone_e164.replace(/[^0-9]/g, ""), [order.phone_e164]);
  const product = order.items?.[0]?.name_ar ?? order.hero_sku;

  const detailsChanged =
    name.trim() !== order.customer_name ||
    qty !== order.hero_qty ||
    total !== order.total_mad ||
    address.trim() !== (order.address ?? "") ||
    city !== matchCity(order.delivery_city || order.city);

  function pickOffer(offerQty: number, price: number) {
    setQty(offerQty);
    setTotal(price);
  }

  async function save() {
    if (saving) return;
    if (!disposition && !detailsChanged) return;
    setSaving(true);
    setSaved(false);
    try {
      let updated = order;
      if (detailsChanged) {
        updated = await editAdminOrder(adminKey, order.id, {
          customer_name: name.trim(),
          qty,
          total_mad: total,
          address: address.trim(),
          delivery_city: city,
        });
      }
      if (disposition) {
        const apiStatus = CALL_VALUE_TO_API[disposition] ?? disposition;
        updated = await updateAdminOrderCall(adminKey, order.id, {
          call_status: apiStatus,
          call_note: note,
          delivery_company: disposition === "confirmed" ? DELIVERY_COMPANY : undefined,
          delivery_city: disposition === "confirmed" ? city : undefined,
        });
      }
      setSaved(true);
      onSaved(updated);
    } catch (err) {
      onError(errorMessage(err, lang));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`rounded-[26px] border bg-white p-5 shadow-sm ${selected ? "border-[#16A34A] ring-2 ring-emerald-200" : "border-gray-100"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {dispatchMode ? (
            <input type="checkbox" checked={selected} onChange={onToggleSelect} className="mt-1 h-5 w-5 accent-[#16A34A]" />
          ) : null}
          <div>
            <p className="text-xs font-black text-[#1E4A8C]">{order.public_order_number}</p>
            <p className="text-sm font-bold text-[#102033]">{product}</p>
            <p className="mt-1 font-mono text-sm text-[#102033]" dir="ltr">{order.phone_e164}</p>
          </div>
        </div>
        <div className="text-end">
          <p className="text-lg font-black text-[#1E4A8C]">{formatMad(total)}</p>
          <p className="text-xs font-bold text-[#667085]">x{qty}</p>
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

      {/* Customer + offer/qty/price editing */}
      <div className="mt-4 space-y-3 rounded-2xl bg-[#F8FAFD] p-4">
        <div>
          <label className="mb-1 block text-[11px] font-black text-[#667085]">{t("Customer", "الزبون")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#1E4A8C]" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-black text-[#667085]">{t("Offer", "العرض")}</label>
          <div className="flex flex-wrap gap-2">
            {HERO_OFFERS.map((offer) => (
              <button
                key={offer.id}
                onClick={() => pickOffer(offer.qty, offer.priceMad)}
                className={`rounded-full px-3 py-1.5 text-xs font-black transition ${qty === offer.qty ? "bg-[#1E4A8C] text-white" : "bg-white text-[#667085] border border-gray-200"}`}
              >
                {offer.sublabel} · {offer.priceMad}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-black text-[#667085]">{t("Quantity", "الكمية")}</label>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#1E4A8C]" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-black text-[#667085]">{t("Total (MAD)", "المجموع (درهم)")}</label>
            <input type="number" min={0} value={total} onChange={(e) => setTotal(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#1E4A8C]" />
          </div>
        </div>
      </div>

      {/* Address + city */}
      <div className="mt-3 space-y-3 rounded-2xl bg-[#F8FAFD] p-4">
        <div>
          <label className="mb-1 block text-[11px] font-black text-[#667085]">{t("Address", "العنوان")}</label>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder={t("Street, neighborhood...", "الشارع، الحي...")} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#1E4A8C]" />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-2 text-[11px] font-black text-[#1E4A8C]">
            <Truck className="h-3.5 w-3.5" />
            {t(`${DELIVERY_COMPANY} city`, `مدينة ${DELIVERY_COMPANY}`)}
          </label>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#1E4A8C]">
            <option value="">{t("Select city", "اختر المدينة")}</option>
            {DIGYLOG_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Disposition */}
      <div className="mt-3">
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

      {/* Note */}
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        placeholder={t("Comment / note (optional)", "ملاحظة (اختياري)")}
        className="mt-3 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#1E4A8C]"
      />

      <button
        onClick={() => void save()}
        disabled={(!disposition && !detailsChanged) || saving}
        className="mt-4 w-full rounded-full bg-[#102033] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1E4A8C] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving
          ? t("Saving...", "كيتسجل...")
          : saved
          ? t("Saved ✓", "تسجل ✓")
          : disposition === "confirmed"
          ? t("Confirm & save", "تأكيد وحفظ")
          : disposition
          ? t("Save disposition", "تسجيل النتيجة")
          : t("Save edits", "حفظ التعديلات")}
      </button>
    </div>
  );
}

function periodAr(key: string) {
  const map: Record<string, string> = {
    today: "اليوم",
    yesterday: "البارح",
    last_7_days: "7 أيام",
    last_15_days: "15 يوم",
    last_30_days: "30 يوم",
    last_month: "الشهر الماضي",
    last_90_days: "90 يوم",
  };
  return map[key] ?? key;
}

function matchCity(value?: string | null) {
  if (!value) return "";
  const found = DIGYLOG_CITIES.find((c) => c.toLowerCase() === value.trim().toLowerCase());
  return found ?? "";
}

function csvCell(value: string | number) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function errorMessage(err: unknown, lang: Lang) {
  if (err instanceof ApiError) return typeof err.message === "string" ? err.message : fallbackError(lang);
  if (err instanceof Error) return err.message;
  return fallbackError(lang);
}

function fallbackError(lang: Lang) {
  return lang === "ar" ? "تعذر حفظ نتيجة المكالمة." : "Could not save call result.";
}
