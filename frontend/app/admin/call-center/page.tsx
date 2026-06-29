"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Phone, RefreshCw, Truck, Download, Send, BarChart3, Wallet, Pencil, RotateCcw, Lock, ListChecks, Plus, X } from "lucide-react";
import {
  AdminCallCenterStats,
  AdminOrder,
  AdminOrderCreate,
  ApiError,
  ConfirmationPayout,
  adminCreateManualOrder,
  dispatchOrders,
  editAdminOrder,
  getAdminOrders,
  getAdminRole,
  getCallCenterStats,
  getConfirmationPayout,
  resetConfirmationPayout,
  updateConfirmationPayout,
  updateAdminOrderCall,
} from "@/lib/api";
import { formatMad } from "@/lib/currency";
import { isValidMoroccoMobile, toE164MoroccoPhone } from "@/lib/phone";
import { DELIVERY_COMPANY, DIGYLOG_CITIES, cleanCityName } from "@/config/digylog";
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

type TabValue = "new" | "follow_up" | "confirmed" | "blacklist" | "all";
type ProductFilterValue = "all" | "american-sugar-balance-complex" | "miracle-men-oil" | "HOYGI22-MAROC11";

const TABS: { value: TabValue; fr: string; ar: string }[] = [
  { value: "new", fr: "Nouvelles", ar: "طلبات جديدة" },
  { value: "follow_up", fr: "À relancer", ar: "للمتابعة" },
  { value: "confirmed", fr: "À expédier", ar: "للإرسال" },
  { value: "blacklist", fr: "Blacklist", ar: "Blacklist" },
  { value: "all", fr: "Toutes", ar: "الكل" },
];

const PRODUCT_FILTERS: { value: ProductFilterValue; fr: string; ar: string; shortAr: string }[] = [
  { value: "all", fr: "All products", ar: "كل المنتجات", shortAr: "الكل" },
  { value: "american-sugar-balance-complex", fr: "Blood Sugar Complex", ar: "المركّب الأمريكي لضبط السكر", shortAr: "ضبط السكر" },
  { value: "miracle-men-oil", fr: "Miracle Men Oil", ar: "الدهان الأمريكي المعجزة للرجال", shortAr: "دهان الرجال" },
  { value: "HOYGI22-MAROC11", fr: "Hoygi Serum", ar: "سيرم علاج التجاعيد ببتيد النحاس الأزرق Hoygi", shortAr: "Hoygi سيرم" },
];

export default function CallCenterPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const [adminKey, setAdminKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [stats, setStats] = useState<AdminCallCenterStats | null>(null);
  const [counts, setCounts] = useState<{ new: number; follow_up: number; confirmed: number; blacklist: number }>({ new: 0, follow_up: 0, confirmed: 0, blacklist: 0 });
  const [productCounts, setProductCounts] = useState<Record<ProductFilterValue, number>>({ all: 0, "american-sugar-balance-complex": 0, "miracle-men-oil": 0, "HOYGI22-MAROC11": 0 });
  const [showStats, setShowStats] = useState(true);
  const [tab, setTab] = useState<TabValue>("new");
  const [productFilter, setProductFilter] = useState<ProductFilterValue>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [role, setRole] = useState<"admin" | "call_center" | null>(null);
  const [payoutVersion, setPayoutVersion] = useState(0);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);

  const isArabic = lang === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);
  const currentKey = savedKey || adminKey;
  const selectedProductSku = productFilter === "all" ? undefined : productFilter;

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
    void loadStats(savedKey);
    void refreshCounts(savedKey);
    void refreshProductCounts(savedKey);
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey, tab, productFilter]);

  useEffect(() => {
    if (!savedKey) {
      setRole(null);
      return;
    }
    getAdminRole(savedKey)
      .then((r) => {
        // Only allow full admins — reject call_center keys
        if (r.role === "admin") {
          setRole(r.role);
          setLoginError(null);
        } else {
          setRole(null);
          setSavedKey("");
          setAdminKey("");
          window.localStorage.removeItem(ADMIN_KEY_STORAGE);
          setLoginError("غير مصرح — هذه الصفحة للأدمين فقط.");
        }
      })
      .catch(() => { setRole(null); setLoginError("مفتاح غير صحيح."); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  async function refreshCounts(key = currentKey) {
    if (!key) return;
    try {
      const product_sku = selectedProductSku;
      const [n, f, c, b] = await Promise.all([
        getAdminOrders(key, { limit: 1, bucket: "new", product_sku }),
        getAdminOrders(key, { limit: 1, bucket: "follow_up", product_sku }),
        getAdminOrders(key, { limit: 1, bucket: "confirmed", product_sku }),
        getAdminOrders(key, { limit: 1, bucket: "blacklist", product_sku }),
      ]);
      setCounts({ new: n.total, follow_up: f.total, confirmed: c.total, blacklist: b.total });
    } catch {
      // counts are non-blocking
    }
  }

  async function refreshProductCounts(key = currentKey) {
    if (!key) return;
    try {
      const entries = await Promise.all(
        PRODUCT_FILTERS.map(async (item) => {
          const params: { limit: number; bucket?: string; product_sku?: string } = { limit: 1 };
          if (tab !== "all") params.bucket = tab;
          if (item.value !== "all") params.product_sku = item.value;
          const result = await getAdminOrders(key, params);
          return [item.value, result.total] as const;
        })
      );
      setProductCounts(Object.fromEntries(entries) as Record<ProductFilterValue, number>);
    } catch {
      // product counts are non-blocking
    }
  }

  async function loadOrders(key = currentKey) {
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      const params: { limit: number; q: string; bucket?: string; product_sku?: string } = { limit: 300, q: query };
      if (tab !== "all") params.bucket = tab;
      if (selectedProductSku) params.product_sku = selectedProductSku;
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
      setStats(await getCallCenterStats(key, selectedProductSku));
    } catch {
      // stats are non-blocking
    }
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = adminKey.trim();
    if (!key) return;
    setLoginError(null);
    window.localStorage.setItem(ADMIN_KEY_STORAGE, key);
    setSavedKey(key);
  }

  function onSaved(updated: AdminOrder) {
    void loadStats();
    void refreshCounts();
    void refreshProductCounts();
    setOrders((current) => {
      // In contact queues a handled order leaves the list once it changes state.
      if ((tab === "new" || tab === "follow_up") && updated.status !== "new") {
        return current.filter((o) => o.id !== updated.id);
      }
      if (tab === "blacklist" && !isBlacklisted(updated)) {
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
      const result = await dispatchOrders(currentKey, ids, DELIVERY_COMPANY);
      const updatedById = new Map(result.orders.map((order) => [order.id, order]));
      setOrders((current) =>
        current
          .map((order) => updatedById.get(order.id) ?? order)
          .filter((order) => {
            if (!selected.has(order.id)) return true;
            if (order.delivery_tracking) return false;
            if (isBlacklisted(order)) return false;
            return true;
          })
      );
      setSelected(new Set());
      void loadStats();
      void refreshCounts();
      void refreshProductCounts();
      setPayoutVersion((v) => v + 1);
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
      const product = displayOrderProductName(o, lang);
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
              onChange={(event) => { setAdminKey(event.target.value); setLoginError(null); }}
              placeholder="ADMIN_API_KEY"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-left font-mono text-sm outline-none focus:border-[#1E4A8C]"
              dir="ltr"
            />
            {loginError && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600">{loginError}</p>
            )}
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
            {role === "admin" && (
              <Link href="/admin" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 transition hover:bg-white/25">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            )}
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

      {role ? <PayoutPanel adminKey={currentKey} lang={lang} version={payoutVersion} readOnly={role !== "admin"} /> : null}

      {showStats && stats ? <StatsPanel stats={stats} lang={lang} /> : null}

      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          {TABS.map((item) => {
            const badge = item.value === "all" ? null : counts[item.value];
            return (
              <button
                key={item.value}
                onClick={() => setTab(item.value)}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black transition ${
                  tab === item.value ? "bg-[#1E4A8C] text-white" : "bg-[#F5F7FB] text-[#667085] hover:bg-[#EEF5FF]"
                }`}
              >
                {t(item.fr, item.ar)}
                {badge ? (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${tab === item.value ? "bg-white/25 text-white" : "bg-[#1E4A8C]/10 text-[#1E4A8C]"}`}>
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 rounded-full border-2 border-dashed border-[#1E4A8C]/30 bg-white px-4 py-1 text-xs font-black text-[#1E4A8C] transition hover:border-[#1E4A8C] hover:bg-[#EEF5FF]"
          >
            <Plus className="h-4 w-4" />
            {t("New Order", "طلب جديد")}
          </button>
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

      <div className="border-b border-gray-200 bg-[#F8FAFD]">
        <div className="mx-auto max-w-[1280px] px-4 py-3 sm:px-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#667085]">{t("Products", "المنتجات")}</p>
              <p className="text-sm font-bold text-[#102033]">
                {t("Each product has its own call center list and data.", "كل منتج عندو اللائحة والبيانات ديالو بوحدو.")}
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#1E4A8C]">
              {t("Active", "المختار")}: {t(PRODUCT_FILTERS.find((item) => item.value === productFilter)?.fr ?? "All products", PRODUCT_FILTERS.find((item) => item.value === productFilter)?.shortAr ?? "الكل")}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {PRODUCT_FILTERS.map((item) => (
              <button
                key={item.value}
                onClick={() => setProductFilter(item.value)}
                className={`rounded-2xl border p-3 text-start transition ${
                  productFilter === item.value ? "border-[#1E4A8C] bg-[#1E4A8C] text-white shadow-lg" : "border-gray-200 bg-white text-[#102033] hover:border-[#1E4A8C]/40"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">{t(item.fr, item.ar)}</p>
                    <p className={`mt-1 text-[11px] font-bold ${productFilter === item.value ? "text-white/70" : "text-[#667085]"}`}>
                      {item.value === "all" ? t("All call center products", "جميع منتجات مركز الاتصال") : item.value}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-black ${productFilter === item.value ? "bg-white/20 text-white" : "bg-[#EEF5FF] text-[#1E4A8C]"}`}>
                    {productCounts[item.value] ?? 0}
                  </span>
                </div>
              </button>
            ))}
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
              blacklistMode={tab === "blacklist"}
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

      {showManualModal && currentKey && (
        <ManualOrderModal
          adminKey={currentKey}
          lang={lang}
          onClose={() => setShowManualModal(false)}
          onSuccess={(newOrder) => {
            setShowManualModal(false);
            void loadOrders();
            void refreshCounts();
            void refreshProductCounts();
            void loadStats();
          }}
        />
      )}
    </section>
  );
}

function PayoutPanel({ adminKey, lang, version, readOnly = false }: { adminKey: string; lang: Lang; version: number; readOnly?: boolean }) {
  const isArabic = lang === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);
  const [data, setData] = useState<ConfirmationPayout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [commission, setCommission] = useState("5");
  const [adjustment, setAdjustment] = useState("0");
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState<ConfirmationPayout["details"]>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (!adminKey) return;
    getConfirmationPayout(adminKey)
      .then((d) => {
        setData(d);
        setCommission(String(d.commission_per_order));
        setAdjustment(String(d.manual_adjustment_mad));
      })
      .catch((err) => setError(errorMessage(err, lang)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey, version]);

  async function saveEdit() {
    setBusy(true);
    setError(null);
    try {
      const updated = await updateConfirmationPayout(adminKey, {
        commission_per_order: Number(commission) || 0,
        manual_adjustment_mad: Number(adjustment) || 0,
      });
      setData(updated);
      setEditing(false);
    } catch (err) {
      setError(errorMessage(err, lang));
    } finally {
      setBusy(false);
    }
  }

  async function toggleDetails() {
    const next = !showDetails;
    setShowDetails(next);
    if (next && !details) {
      try {
        const d = await getConfirmationPayout(adminKey, true);
        setDetails(d.details ?? []);
      } catch (err) {
        setError(errorMessage(err, lang));
      }
    }
  }

  async function doReset() {
    setBusy(true);
    setError(null);
    try {
      const updated = await resetConfirmationPayout(adminKey, pin);
      setData(updated);
      setCommission(String(updated.commission_per_order));
      setAdjustment(String(updated.manual_adjustment_mad));
      setDetails(null);
      setShowDetails(false);
      setPinOpen(false);
      setPin("");
    } catch (err) {
      setError(errorMessage(err, lang));
    } finally {
      setBusy(false);
    }
  }

  const lastReset = data?.last_reset_at ? data.last_reset_at.slice(0, 10) : "—";
  const isPaid = data?.status === "paid";

  return (
    <div className="border-b border-[#11233c] bg-gradient-to-l from-[#0B1724] to-[#12325f] text-white">
      <div className="mx-auto max-w-[1280px] px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-amber-300" />
            <h2 className="text-base font-black">{t("Confirmation Team Payments", "مستحقات فريق التأكيد")}</h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-black ${
              isPaid ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
            }`}
          >
            {isPaid ? t("Paid", "مدفوع") : t("Unpaid", "غير مدفوع")}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-white/60">{t("Confirmed & Sent Orders", "طلبات مؤكدة ومرسلة")}</p>
            <p className="mt-1 text-2xl font-black">{(data?.orders_count ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-white/60">{t("Commission / Order", "العمولة / طلب")}</p>
            {editing ? (
              <input
                value={commission}
                onChange={(e) => setCommission(e.target.value.replace(/[^0-9]/g, ""))}
                className="mt-1 w-full rounded-lg bg-white/90 px-2 py-1 text-lg font-black text-[#102033] outline-none"
              />
            ) : (
              <p className="mt-1 text-2xl font-black">{data?.commission_per_order ?? 5} <span className="text-sm">MAD</span></p>
            )}
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-white/60">{t("Manual Adjustment", "تعديل يدوي")}</p>
            {editing ? (
              <input
                value={adjustment}
                onChange={(e) => setAdjustment(e.target.value.replace(/[^0-9-]/g, ""))}
                className="mt-1 w-full rounded-lg bg-white/90 px-2 py-1 text-lg font-black text-[#102033] outline-none"
              />
            ) : (
              <p className="mt-1 text-2xl font-black">{(data?.manual_adjustment_mad ?? 0).toLocaleString()} <span className="text-sm">MAD</span></p>
            )}
          </div>
          <div className="rounded-2xl bg-amber-400/15 p-3 ring-1 ring-amber-300/30">
            <p className="text-[10px] font-black uppercase tracking-wide text-amber-200">{t("Total Due", "المجموع المستحق")}</p>
            <p className="mt-1 text-2xl font-black text-amber-300">{formatMad(data?.total_due_mad ?? 0)}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-white/60">
            {t("Last Reset", "آخر تصفية")}: <span className="font-black text-white/90">{lastReset}</span>
          </span>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            {!readOnly && editing ? (
              <>
                <button onClick={() => void saveEdit()} disabled={busy} className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-black disabled:opacity-50">
                  {t("Save", "حفظ")}
                </button>
                <button onClick={() => { setEditing(false); setCommission(String(data?.commission_per_order ?? 5)); setAdjustment(String(data?.manual_adjustment_mad ?? 0)); }} className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-black">
                  {t("Cancel", "إلغاء")}
                </button>
              </>
            ) : !readOnly ? (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-xs font-black hover:bg-white/25">
                <Pencil className="h-3.5 w-3.5" />
                {t("Edit Amount", "تعديل المبلغ")}
              </button>
            ) : null}
            <button onClick={() => void toggleDetails()} className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-xs font-black hover:bg-white/25">
              <ListChecks className="h-3.5 w-3.5" />
              {t("Calculation Details", "تفاصيل الحساب")}
            </button>
            {!readOnly ? (
              <button onClick={() => setPinOpen((v) => !v)} className="flex items-center gap-1.5 rounded-full bg-rose-500 px-4 py-1.5 text-xs font-black hover:bg-rose-600">
                <RotateCcw className="h-3.5 w-3.5" />
                {t("Mark as Paid & Reset", "تسجيل كمدفوع وتصفية")}
              </button>
            ) : null}
          </div>
        </div>

        {pinOpen ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-black/30 p-3">
            <Lock className="h-4 w-4 text-amber-300" />
            <span className="text-xs font-bold text-white/80">{t("Enter admin PIN to confirm reset", "دخل رمز الأدمين لتأكيد التصفية")}</span>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              className="rounded-lg bg-white/90 px-3 py-1.5 text-sm font-black text-[#102033] outline-none"
            />
            <button onClick={() => void doReset()} disabled={busy || !pin} className="rounded-full bg-rose-500 px-4 py-1.5 text-xs font-black disabled:opacity-50">
              {t("Confirm Reset", "تأكيد التصفية")}
            </button>
            <button onClick={() => { setPinOpen(false); setPin(""); }} className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-black">
              {t("Cancel", "إلغاء")}
            </button>
          </div>
        ) : null}

        {error ? <p className="mt-2 rounded-xl bg-rose-500/20 px-3 py-2 text-xs font-bold text-rose-200">{error}</p> : null}

        {showDetails ? (
          <div className="mt-3 max-h-64 overflow-auto rounded-2xl bg-white/5">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0B1724] text-white/60">
                <tr>
                  <th className="px-3 py-2 text-start font-black">{t("Order", "الطلب")}</th>
                  <th className="px-3 py-2 text-start font-black">{t("Customer", "الزبون")}</th>
                  <th className="px-3 py-2 text-start font-black">{t("Sent", "أُرسل")}</th>
                  <th className="px-3 py-2 text-end font-black">{t("Commission", "العمولة")}</th>
                </tr>
              </thead>
              <tbody>
                {(details ?? []).map((d) => (
                  <tr key={d.order_id} className="border-t border-white/10">
                    <td className="px-3 py-2 font-bold">{d.public_order_number}</td>
                    <td className="px-3 py-2">{d.customer_name}</td>
                    <td className="px-3 py-2 text-white/70">{d.dispatched_at ? d.dispatched_at.slice(0, 10) : "—"}</td>
                    <td className="px-3 py-2 text-end font-black text-amber-300">{d.commission_mad} MAD</td>
                  </tr>
                ))}
                {details && !details.length ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-white/60">{t("No orders since last reset.", "ماكاين حتى طلب من آخر تصفية.")}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
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
  blacklistMode,
  selected,
  onToggleSelect,
  onSaved,
  onError,
}: {
  order: AdminOrder;
  lang: Lang;
  adminKey: string;
  dispatchMode: boolean;
  blacklistMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onSaved: (order: AdminOrder) => void;
  onError: (msg: string) => void;
}) {
  const isArabic = lang === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);
  const [disposition, setDisposition] = useState<string>("");
  const [name, setName] = useState<string>(order.customer_name);
  const [phone, setPhone] = useState<string>(order.phone_local || order.phone_e164);
  const [qty, setQty] = useState<number>(order.hero_qty);
  const [total, setTotal] = useState<number>(order.total_mad);
  const [address, setAddress] = useState<string>(order.address ?? "");
  const [city, setCity] = useState<string>(matchCity(order.delivery_city || order.city));
  const [note, setNote] = useState<string>(order.call_note ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const phoneDigits = useMemo(() => order.phone_e164.replace(/[^0-9]/g, ""), [order.phone_e164]);
  const product = displayOrderProductName(order, lang);

  const detailsChanged =
    name.trim() !== order.customer_name ||
    (blacklistMode && phone.trim() !== (order.phone_local || order.phone_e164)) ||
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
        if (blacklistMode && !isValidMoroccoMobile(phone)) {
          throw new Error(t("Enter a valid Moroccan phone number.", "دخل رقم هاتف مغربي صحيح."));
        }
        updated = await editAdminOrder(adminKey, order.id, {
          customer_name: name.trim(),
          ...(blacklistMode ? { phone_raw: phone.trim(), phone_e164: toE164MoroccoPhone(phone) } : {}),
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

      {order.delivery_tracking ? (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
          {t("Sent to", "تسيفط لـ")} {order.delivery_company || DELIVERY_COMPANY} · {order.delivery_tracking}
        </p>
      ) : null}
      {order.delivery_error ? (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700">
          {t("Dispatch failed", "فشل الإرسال")}: {formatDeliveryError(order.delivery_error, order, lang)}
        </p>
      ) : null}

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
        {blacklistMode ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-3">
            <label className="mb-1 block text-[11px] font-black text-red-700">{t("Edit phone number", "تعديل رقم الهاتف")}</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              inputMode="tel"
              placeholder="0612345678"
              className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-black outline-none focus:border-red-500"
            />
            <p className="mt-1 text-[11px] font-bold text-red-700">
              {t("Only available in Blacklist to correct rejected Digylog phone numbers.", "متاح فقط فـ Blacklist باش تصلح الرقم المرفوض من Digylog.")}
            </p>
          </div>
        ) : null}
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
          <CitySelect value={city} onChange={setCity} lang={lang} />
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

function displayOrderProductName(order: AdminOrder, lang: Lang) {
  if (order.hero_sku === "miracle-men-oil") {
    return lang === "ar" ? "الدهان الأمريكي المعجزة للرجال" : "Miracle Men Oil";
  }
  if (order.hero_sku === "american-sugar-balance-complex") {
    return lang === "ar" ? "المركّب الأمريكي لضبط السكر" : "Blood Sugar Complex";
  }
  return order.items?.[0]?.name_ar ?? order.hero_sku;
}

function matchCity(value?: string | null) {
  if (!value) return "";
  const needle = cleanCityName(value).toLowerCase();
  const found = DIGYLOG_CITIES.find((c) => c.toLowerCase() === needle);
  return found ?? "";
}

function CitySelect({ value, onChange, lang }: { value: string; onChange: (city: string) => void; lang: Lang }) {
  const isArabic = lang === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle ? DIGYLOG_CITIES.filter((c) => c.toLowerCase().includes(needle)) : DIGYLOG_CITIES;
    return list.slice(0, 30);
  }, [query]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={t("Type a city...", "كتب اسم المدينة...")}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#1E4A8C]"
      />
      {open ? (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {matches.length ? (
            matches.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(c);
                    setQuery(c);
                    setOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-start text-sm font-semibold transition hover:bg-[#EEF5FF] ${c === value ? "bg-[#EEF5FF] text-[#1E4A8C]" : "text-[#102033]"}`}
                >
                  {c}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm font-semibold text-[#94A3B8]">{t("No match", "ماكاينة")}</li>
          )}
        </ul>
      ) : null}
    </div>
  );
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

function isBlacklisted(order: AdminOrder) {
  const message = (order.delivery_error || "").toLowerCase();
  return message.includes("liste noire") || message.includes("blacklist") || message.includes("القائمة السوداء") || message.includes("noire");
}

function formatDeliveryError(message: string, order: AdminOrder, lang: Lang) {
  const lower = message.toLowerCase();
  if (lower.includes("liste noire") || lower.includes("blacklist")) {
    const phone = order.phone_local || order.phone_e164;
    return lang === "ar"
      ? `هذا الرقم موجود في القائمة السوداء لدى Digylog ولا يمكن إرساله: ${phone}`
      : `This phone number is blacklisted by Digylog and cannot be dispatched: ${phone}`;
  }
  if (lower.includes("returned no tracking reference")) {
    return lang === "ar"
      ? "قبلت Digylog الطلب ولكن لم ترجع رقم تتبع. راجع الطلب داخل منصة Digylog."
      : "Digylog accepted the order but returned no tracking number. Check the order in Digylog.";
  }
  return message;
}

function fallbackError(lang: Lang) {
  return lang === "ar" ? "تعذر حفظ نتيجة المكالمة." : "Could not save call result.";
}

function ManualOrderModal({
  adminKey,
  lang,
  onClose,
  onSuccess,
}: {
  adminKey: string;
  lang: Lang;
  onClose: () => void;
  onSuccess: (order: AdminOrder) => void;
}) {
  const isArabic = lang === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [productSku, setProductSku] = useState<string>(PRODUCT_FILTERS[1].value);
  const [qty, setQty] = useState(1);
  const [priceMad, setPriceMad] = useState(199);
  const [shippingMad, setShippingMad] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("new");
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forceDuplicate, setForceDuplicate] = useState(false);

  const total = (qty * priceMad) + shippingMad;

  useEffect(() => {
    if (productSku === "american-sugar-balance-complex") setPriceMad(199);
    else if (productSku === "miracle-men-oil") setPriceMad(199);
    else if (productSku === "HOYGI22-MAROC11") setPriceMad(199);
  }, [productSku]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !city.trim() || !address.trim()) {
      setError(t("Please fill all required fields.", "المرجو ملء جميع الحقول الإجبارية (الاسم، الهاتف، المدينة، العنوان)."));
      return;
    }
    if (!isValidMoroccoMobile(phone)) {
      setError(t("Invalid phone number.", "رقم الهاتف غير صحيح."));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: AdminOrderCreate = {
        customer_name: name.trim(),
        phone_raw: phone.trim(),
        city: city.trim(),
        address: address.trim(),
        product_sku: productSku,
        qty,
        price_mad: priceMad,
        shipping_cost_mad: shippingMad,
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
        status,
        force_duplicate: forceDuplicate,
      };
      const order = await adminCreateManualOrder(adminKey, payload);
      onSuccess(order);
      alert(t("Order created successfully", "تم إنشاء الطلب بنجاح"));
    } catch (err) {
      const msg = errorMessage(err, lang);
      if (msg.toLowerCase().includes("duplicate") || msg.includes("تكرار")) {
        setError(t("This phone number already has an active order. Force create?", "هاد الرقم ديجا عندو طلب مفتوح. واش بغيتي تزيدو بزز؟"));
        setForceDuplicate(true);
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-[#F8FAFD] px-6 py-4">
          <h2 className="text-lg font-black text-[#1E4A8C]">{t("New Manual Order", "إضافة طلب جديد")}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
              {error}
              {forceDuplicate && (
                <div className="mt-3">
                  <label className="flex items-center gap-2 text-red-800">
                    <input type="checkbox" checked={forceDuplicate} onChange={(e) => setForceDuplicate(e.target.checked)} className="h-4 w-4 accent-red-600" />
                    {t("Confirm duplicate order creation", "تأكيد إضافة الطلب رغم التكرار")}
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-[#667085]">{t("Customer Info", "معلومات الزبون")}</h3>
              
              <div>
                <label className="mb-1 block text-[11px] font-black text-[#667085]">{t("Full Name *", "الاسم الكامل *")}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#1E4A8C]" />
              </div>
              
              <div>
                <label className="mb-1 block text-[11px] font-black text-[#667085]">{t("Phone *", "رقم الهاتف *")}</label>
                <input value={phone} onChange={(e) => { setPhone(e.target.value); setForceDuplicate(false); setError(null); }} required dir="ltr"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#1E4A8C]" />
              </div>
              
              <div>
                <label className="mb-1 block text-[11px] font-black text-[#667085]">{t("City *", "المدينة *")}</label>
                <CitySelect value={city} onChange={setCity} lang={lang} />
              </div>
              
              <div>
                <label className="mb-1 block text-[11px] font-black text-[#667085]">{t("Address *", "العنوان *")}</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} required rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#1E4A8C]" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-[#667085]">{t("Order Details", "تفاصيل الطلب")}</h3>
              
              <div>
                <label className="mb-1 block text-[11px] font-black text-[#667085]">{t("Product *", "المنتج *")}</label>
                <select value={productSku} onChange={(e) => setProductSku(e.target.value)} required
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#1E4A8C]">
                  {PRODUCT_FILTERS.filter(f => f.value !== "all").map(f => (
                    <option key={f.value} value={f.value}>{t(f.fr, f.ar)}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-black text-[#667085]">{t("Quantity", "الكمية")}</label>
                  <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} required
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#1E4A8C]" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-black text-[#667085]">{t("Unit Price (MAD)", "ثمن الوحدة (درهم)")}</label>
                  <input type="number" min={0} value={priceMad} onChange={(e) => setPriceMad(Math.max(0, Number(e.target.value) || 0))} required
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#1E4A8C]" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-black text-[#667085]">{t("Shipping (MAD)", "ثمن التوصيل (درهم)")}</label>
                  <input type="number" min={0} value={shippingMad} onChange={(e) => setShippingMad(Math.max(0, Number(e.target.value) || 0))} required
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#1E4A8C]" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-black text-[#1E4A8C]">{t("Total", "المجموع")}</label>
                  <div className="w-full rounded-xl border border-[#1E4A8C]/20 bg-[#EEF5FF] px-3 py-2 text-sm font-black text-[#1E4A8C]">
                    {total} MAD
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-black text-[#667085]">{t("Payment Method", "طريقة الدفع")}</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#1E4A8C]">
                    <option value="cod">{t("Cash on Delivery", "الدفع عند الاستلام")}</option>
                    <option value="card">{t("Credit Card", "البطاقة البنكية")}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-black text-[#667085]">{t("Status", "الحالة")}</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#1E4A8C]">
                    <option value="new">{t("New", "جديد")}</option>
                    <option value="confirmed">{t("Confirmed", "مؤكد")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-black text-[#667085]">{t("Notes", "ملاحظات")}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#1E4A8C]" />
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
            <button type="button" onClick={onClose} className="rounded-full px-5 py-2.5 text-sm font-black text-[#667085] transition hover:bg-gray-100">
              {t("Cancel", "إلغاء")}
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-full bg-[#1E4A8C] px-6 py-2.5 text-sm font-black text-white transition hover:bg-[#173B70] disabled:opacity-50">
              {saving ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Plus className="h-4 w-4" />}
              {t("Save Order", "حفظ الطلب")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
