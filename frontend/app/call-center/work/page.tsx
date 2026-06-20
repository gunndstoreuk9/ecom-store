"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Download, ListChecks, LogOut, Phone, RefreshCw, Send, Truck, Wallet } from "lucide-react";
import {
  AdminCallCenterStats,
  AdminOrder,
  AgentSession,
  AgentStats,
  ApiError,
  ConfirmationPayout,
  agentDispatchOrders,
  agentEditOrder,
  agentLogout,
  agentUpdateOrderCall,
  getAgentCallCenterStats,
  getAgentMe,
  getAgentOrders,
  getAgentPayout,
} from "@/lib/api";
import { formatMad } from "@/lib/currency";
import { isValidMoroccoMobile, toE164MoroccoPhone } from "@/lib/phone";
import { DELIVERY_COMPANY, DIGYLOG_CITIES, cleanCityName } from "@/config/digylog";
import { HERO_OFFERS } from "@/config/offers";

const SESSION_KEY = "cc_agent_session";

const CALL_STATUSES = [
  { value: "confirmed", ar: "مؤكد", tone: "bg-emerald-600 text-white", soft: "bg-emerald-50 text-emerald-700" },
  { value: "no_answer", ar: "لا يجيب", tone: "bg-amber-500 text-white", soft: "bg-amber-50 text-amber-700" },
  { value: "voicemail", ar: "صندوق صوتي", tone: "bg-orange-500 text-white", soft: "bg-orange-50 text-orange-700" },
  { value: "annule", ar: "ملغى", tone: "bg-rose-600 text-white", soft: "bg-rose-50 text-rose-700" },
  { value: "wrong_number", ar: "رقم خاطئ", tone: "bg-red-600 text-white", soft: "bg-red-50 text-red-700" },
  { value: "busy", ar: "مشغول", tone: "bg-yellow-500 text-white", soft: "bg-yellow-50 text-yellow-700" },
  { value: "duplicate", ar: "طلب مكرر", tone: "bg-slate-600 text-white", soft: "bg-slate-100 text-slate-700" },
] as const;

const CALL_VALUE_TO_API: Record<string, string> = { annule: "cancelled" };

type TabValue = "new" | "follow_up" | "confirmed" | "blacklist" | "all";
type ProductFilter = "all" | "american-sugar-balance-complex" | "miracle-men-oil";

const TABS: { value: TabValue; ar: string }[] = [
  { value: "new", ar: "طلبات جديدة" },
  { value: "follow_up", ar: "للمتابعة" },
  { value: "confirmed", ar: "للإرسال" },
  { value: "blacklist", ar: "Blacklist" },
  { value: "all", ar: "الكل" },
];

const PRODUCT_FILTERS: { value: ProductFilter; ar: string; shortAr: string }[] = [
  { value: "all", ar: "كل المنتجات", shortAr: "الكل" },
  { value: "american-sugar-balance-complex", ar: "المركّب الأمريكي لضبط السكر", shortAr: "ضبط السكر" },
  { value: "miracle-men-oil", ar: "الدهان الأمريكي المعجزة للرجال", shortAr: "دهان الرجال" },
];

const PERIOD_AR: Record<string, string> = {
  today: "اليوم", yesterday: "البارح", last_7_days: "7 أيام",
  last_15_days: "15 يوم", last_30_days: "30 يوم",
  last_month: "الشهر الماضي", last_90_days: "90 يوم",
};

function matchCity(value?: string | null): string {
  if (!value) return "";
  const needle = cleanCityName(value).toLowerCase();
  return DIGYLOG_CITIES.find((c) => c.toLowerCase() === needle) ?? "";
}

function displayProductName(order: AdminOrder): string {
  if (order.hero_sku === "miracle-men-oil") return "الدهان الأمريكي المعجزة للرجال";
  if (order.hero_sku === "american-sugar-balance-complex") return "المركّب الأمريكي لضبط السكر";
  return order.items?.[0]?.name_ar ?? order.hero_sku;
}

function isBlacklisted(order: AdminOrder): boolean {
  const msg = (order.delivery_error || "").toLowerCase();
  return msg.includes("liste noire") || msg.includes("blacklist");
}

function formatDeliveryError(message: string, order: AdminOrder): string {
  const lower = message.toLowerCase();
  if (lower.includes("liste noire") || lower.includes("blacklist")) {
    const phone = order.phone_local || order.phone_e164;
    return `هذا الرقم موجود في القائمة السوداء لدى Digylog: ${phone}`;
  }
  if (lower.includes("returned no tracking reference")) {
    return "قبلت Digylog الطلب ولكن لم ترجع رقم تتبع. راجع الطلب داخل منصة Digylog.";
  }
  return message;
}

function errMsg(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "تعذر حفظ نتيجة المكالمة.";
}

function csvCell(value: string | number) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export default function AgentWorkspacePage() {
  const router = useRouter();
  const [session, setSession] = useState<AgentSession | null>(null);
  const [myStats, setMyStats] = useState<AgentStats | null>(null);
  const [detailedStats, setDetailedStats] = useState<AdminCallCenterStats | null>(null);
  const [payout, setPayout] = useState<ConfirmationPayout | null>(null);
  const [payoutVersion, setPayoutVersion] = useState(0);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [counts, setCounts] = useState({ new: 0, follow_up: 0, confirmed: 0, blacklist: 0 });
  const [productCounts, setProductCounts] = useState<Record<ProductFilter, number>>({ all: 0, "american-sugar-balance-complex": 0, "miracle-men-oil": 0 });
  const [tab, setTab] = useState<TabValue>("new");
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<string | null>(null);

  const selectedProductSku = productFilter === "all" ? undefined : productFilter;

  // Load session
  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) { router.replace("/call-center/login"); return; }
    try {
      const s = JSON.parse(raw) as AgentSession;
      if (!s?.token) throw new Error();
      setSession(s);
    } catch {
      localStorage.removeItem(SESSION_KEY);
      router.replace("/call-center/login");
    }
  }, [router]);

  useEffect(() => {
    if (!session) return;
    void loadOrders(session.token);
    void loadCounts(session.token);
    void loadProductCounts(session.token);
    void loadStats(session.token);
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, tab, productFilter]);

  async function loadOrders(token: string) {
    setLoading(true); setError(null);
    try {
      const bucket = tab !== "all" ? tab : undefined;
      const result = await getAgentOrders(token, {
        limit: 200,
        q: query,
        bucket,
        ...(selectedProductSku ? { product_sku: selectedProductSku } : {}),
      });
      setOrders(result.orders);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { handleLogout(); return; }
      setError(errMsg(e));
    } finally { setLoading(false); }
  }

  async function loadCounts(token: string) {
    try {
      const sku = selectedProductSku;
      const [n, f, c, b] = await Promise.all([
        getAgentOrders(token, { limit: 1, bucket: "new", ...(sku ? { product_sku: sku } : {}) }),
        getAgentOrders(token, { limit: 1, bucket: "follow_up", ...(sku ? { product_sku: sku } : {}) }),
        getAgentOrders(token, { limit: 1, bucket: "confirmed", ...(sku ? { product_sku: sku } : {}) }),
        getAgentOrders(token, { limit: 1, bucket: "blacklist", ...(sku ? { product_sku: sku } : {}) }),
      ]);
      setCounts({ new: n.total, follow_up: f.total, confirmed: c.total, blacklist: b.total });
    } catch { /* non-blocking */ }
  }

  async function loadProductCounts(token: string) {
    try {
      const bucket = tab !== "all" ? tab : undefined;
      const entries = await Promise.all(
        PRODUCT_FILTERS.map(async (item) => {
          const params: Record<string, unknown> = { limit: 1 };
          if (bucket) params.bucket = bucket;
          if (item.value !== "all") params.product_sku = item.value;
          const result = await getAgentOrders(token, params as Parameters<typeof getAgentOrders>[1]);
          return [item.value, result.total] as const;
        })
      );
      setProductCounts(Object.fromEntries(entries) as Record<ProductFilter, number>);
    } catch { /* non-blocking */ }
  }

  async function loadStats(token: string) {
    // Load each independently so one failure doesn't hide the others
    getAgentMe(token).then(setMyStats).catch(() => { /* non-blocking */ });
    getAgentCallCenterStats(token, selectedProductSku).then(setDetailedStats).catch(() => { /* non-blocking */ });
    getAgentPayout(token).then(setPayout).catch(() => { /* non-blocking */ });
  }

  function onSaved(updated: AdminOrder) {
    if (session) { void loadCounts(session.token); void loadProductCounts(session.token); void loadStats(session.token); }
    setOrders((cur) => {
      if ((tab === "new" || tab === "follow_up") && updated.status !== "new") {
        return cur.filter((o) => o.id !== updated.id);
      }
      if (tab === "blacklist" && !isBlacklisted(updated)) {
        return cur.filter((o) => o.id !== updated.id);
      }
      return cur.map((o) => (o.id === updated.id ? updated : o));
    });
  }

  function toggleSelected(id: string) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function exportCsv() {
    const rows = orders.filter((o) => selected.size === 0 || selected.has(o.id));
    if (!rows.length) return;
    const header = ["Product", "Quantity", "Customer", "Phone", "Address", "City", "Price", "Commentaire"];
    const lines = rows.map((o) => {
      const city = o.delivery_city || o.city || "";
      return [displayProductName(o), o.hero_qty, o.customer_name, o.phone_e164, o.address || "", city, o.total_mad, o.call_note || ""]
        .map(csvCell).join(",");
    });
    const csv = "\uFEFF" + [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleLogout() {
    if (session) { try { await agentLogout(session.token); } catch { /**/ } }
    localStorage.removeItem(SESSION_KEY);
    router.replace("/call-center/login");
  }

  async function handleDispatch() {
    if (!session) return;
    const ids = orders.filter((o) => selected.has(o.id)).map((o) => o.id);
    if (!ids.length) return;
    setDispatching(true);
    setDispatchResult(null);
    setError(null);
    try {
      const res = await agentDispatchOrders(session.token, ids, DELIVERY_COMPANY);
      const updatedById = new Map(res.orders.map((o) => [o.id, o]));
      setOrders((cur) =>
        cur
          .map((o) => updatedById.get(o.id) ?? o)
          .filter((o) => {
            if (!selected.has(o.id)) return true;
            if (o.delivery_tracking) return false;
            if (isBlacklisted(o)) return false;
            return true;
          })
      );
      setSelected(new Set());
      void loadCounts(session.token);
      void loadStats(session.token);
      setPayoutVersion((v) => v + 1);
      const succeeded = res.orders.filter((o) => !o.delivery_error).length;
      const failed = res.orders.filter((o) => o.delivery_error).length;
      setDispatchResult(failed > 0 ? `✓ ${succeeded} تم الإرسال · ✗ ${failed} فشل` : `✓ تم إرسال ${succeeded} طلب إلى Digylog`);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setDispatching(false);
    }
  }

  const isDispatch = tab === "confirmed";
  const isBlacklistTab = tab === "blacklist";

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B1724] to-[#1E4A8C] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <section dir="rtl" className="min-h-screen bg-[#F5F7FB] text-[#102033]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-l from-[#0B1724] to-[#1E4A8C] text-white shadow-lg">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-white/70">مركز الاتصال · {DELIVERY_COMPANY}</p>
              <h1 className="text-xl font-black">{session.display_name}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowStats((v) => !v)}
              className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black transition hover:bg-white/25"
            >
              <BarChart3 className="h-4 w-4" />
              النسب
            </button>
            <button
              onClick={() => { void loadOrders(session.token); void loadCounts(session.token); void loadProductCounts(session.token); void loadStats(session.token); }}
              className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black transition hover:bg-white/25"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              تحديث
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black transition hover:bg-rose-500/40"
            >
              <LogOut className="h-4 w-4" />
              خروج
            </button>
          </div>
        </div>
      </header>

      {/* Payout Panel */}
      {payout && <AgentPayoutPanel token={session.token} payout={payout} onPayoutChange={setPayout} version={payoutVersion} />}

      {/* Stats Panel */}
      {showStats && (myStats || detailedStats) && (
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-[1280px] px-4 py-4 sm:px-6">
            {/* Basic stats row */}
            {myStats && (
              <>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-[#667085]">إحصائياتي الشخصية</p>
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-2xl border border-gray-100 bg-[#F8FAFD] p-3 text-center">
                    <p className="text-[10px] font-black uppercase text-[#667085]">نسبة التأكيد</p>
                    <p className="mt-1 text-lg font-black text-emerald-600">{myStats.confirmation_rate.toFixed(1)}%</p>
                    <p className="text-[10px] font-bold text-[#94A3B8]">{myStats.confirmed}/{myStats.total_assigned}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-[#F8FAFD] p-3 text-center">
                    <p className="text-[10px] font-black uppercase text-[#667085]">إجمالي الطلبات</p>
                    <p className="mt-1 text-lg font-black text-[#1E4A8C]">{myStats.total_assigned}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-[#F8FAFD] p-3 text-center">
                    <p className="text-[10px] font-black uppercase text-[#667085]">مفتوحة</p>
                    <p className="mt-1 text-lg font-black text-amber-600">{myStats.pending_open}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-[#F8FAFD] p-3 text-center">
                    <p className="text-[10px] font-black uppercase text-[#667085]">متوسط الرد</p>
                    <p className="mt-1 text-lg font-black text-[#1E4A8C]">
                      {myStats.avg_response_minutes != null ? `${myStats.avg_response_minutes}د` : "—"}
                    </p>
                  </div>
                </div>
              </>
            )}
            {/* Detailed stats by period */}
            {detailedStats && detailedStats.by_period.length > 0 && (
              <>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-[#667085]">نسبة التأكيد حسب الفترة</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {detailedStats.by_period.map((p) => (
                    <div key={p.key} className="rounded-2xl border border-gray-100 bg-[#F8FAFD] p-3 text-center">
                      <p className="text-[10px] font-black uppercase text-[#667085]">{PERIOD_AR[p.key] ?? p.key}</p>
                      <p className="mt-1 text-lg font-black text-[#1E4A8C]">{p.rate}%</p>
                      <p className="text-[10px] font-bold text-[#94A3B8]">{p.confirmed}/{p.total}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
            {/* Detailed stats by offer */}
            {detailedStats && detailedStats.by_offer.length > 0 && (
              <>
                <p className="mb-2 mt-4 text-xs font-black uppercase tracking-wide text-[#667085]">نسبة التأكيد حسب العرض</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {detailedStats.by_offer.map((o) => {
                    const offerLabel = HERO_OFFERS.find((h) => h.qty === o.qty)?.sublabel ?? `${o.qty}`;
                    return (
                      <div key={o.offer_id} className="rounded-2xl border border-gray-100 bg-[#F8FAFD] p-3 text-center">
                        <p className="text-[10px] font-black uppercase text-[#667085]">{offerLabel}</p>
                        <p className="mt-1 text-lg font-black text-emerald-600">{o.rate}%</p>
                        <p className="text-[10px] font-bold text-[#94A3B8]">{o.confirmed}/{o.total}</p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tabs + Search */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          {TABS.map((item) => {
            const badge = item.value !== "all" ? counts[item.value as keyof typeof counts] : null;
            return (
              <button
                key={item.value}
                onClick={() => setTab(item.value)}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black transition ${
                  tab === item.value ? "bg-[#1E4A8C] text-white" : "bg-[#F5F7FB] text-[#667085] hover:bg-[#EEF5FF]"
                }`}
              >
                {item.ar}
                {badge != null ? (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${tab === item.value ? "bg-white/25 text-white" : "bg-[#1E4A8C]/10 text-[#1E4A8C]"}`}>
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
          <div className="ms-auto flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void loadOrders(session.token); }}
              placeholder="بحث..."
              className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-bold outline-none focus:border-[#1E4A8C]"
            />
            <span className="rounded-full bg-[#EEF5FF] px-3 py-1.5 text-xs font-black text-[#1E4A8C]">{orders.length}</span>
          </div>
        </div>
      </div>

      {/* Product Filter */}
      <div className="border-b border-gray-200 bg-[#F8FAFD]">
        <div className="mx-auto max-w-[1280px] px-4 py-3 sm:px-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#667085]">المنتجات</p>
              <p className="text-sm font-bold text-[#102033]">كل منتج عندو اللائحة والبيانات ديالو بوحدو.</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#1E4A8C]">
              المختار: {PRODUCT_FILTERS.find((f) => f.value === productFilter)?.shortAr ?? "الكل"}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {PRODUCT_FILTERS.map((item) => (
              <button
                key={item.value}
                onClick={() => setProductFilter(item.value)}
                className={`rounded-2xl border p-3 text-start transition ${
                  productFilter === item.value
                    ? "border-[#1E4A8C] bg-[#1E4A8C] text-white shadow-lg"
                    : "border-gray-200 bg-white text-[#102033] hover:border-[#1E4A8C]/40"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">{item.ar}</p>
                    <p className={`mt-1 text-[11px] font-bold ${productFilter === item.value ? "text-white/70" : "text-[#667085]"}`}>
                      {item.value === "all" ? "جميع منتجات مركز الاتصال" : item.value}
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

      {/* Dispatch bar (confirmed tab only) */}
      {isDispatch && (
        <div className="border-b border-gray-200 bg-[#EEF5FF]">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <span className="text-xs font-black text-[#1E4A8C]">{selected.size} مختار</span>
            <button
              onClick={() => setSelected(selected.size === orders.length ? new Set() : new Set(orders.map((o) => o.id)))}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#1E4A8C]"
            >
              {selected.size === orders.length && orders.length ? "إلغاء التحديد" : "تحديد الكل"}
            </button>
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-black text-[#102033]"
            >
              <Download className="h-4 w-4" />
              تصدير CSV
            </button>
            <button
              onClick={() => void handleDispatch()}
              disabled={!selected.size || dispatching}
              className="flex items-center gap-2 rounded-full bg-[#16A34A] px-4 py-1.5 text-xs font-black text-white disabled:opacity-50"
            >
              {dispatching ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              إرسال إلى {DELIVERY_COMPANY}
            </button>
            {dispatchResult && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{dispatchResult}</span>
            )}
          </div>
        </div>
      )}

      {/* Orders */}
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6">
        {error ? (
          <div className="mb-4 rounded-3xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {orders.map((order) => (
            <CallCard
              key={order.id}
              order={order}
              token={session.token}
              dispatchMode={isDispatch}
              blacklistMode={isBlacklistTab}
              selected={selected.has(order.id)}
              onToggleSelect={() => toggleSelected(order.id)}
              onSaved={onSaved}
              onError={(msg) => setError(msg)}
            />
          ))}
        </div>
        {!orders.length && !loading ? (
          <div className="flex min-h-40 items-center justify-center rounded-3xl bg-white p-8 text-center text-sm font-bold text-[#667085]">
            ماكاين حتى طلب فهاد اللائحة.
          </div>
        ) : null}
      </main>
    </section>
  );
}

function AgentPayoutPanel({
  token,
  payout,
  onPayoutChange,
  version,
}: {
  token: string;
  payout: ConfirmationPayout;
  onPayoutChange: (p: ConfirmationPayout) => void;
  version: number;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState<ConfirmationPayout["details"]>(null);
  const [error, setError] = useState<string | null>(null);
  const isPaid = payout.status === "paid";
  const lastReset = payout.last_reset_at ? payout.last_reset_at.slice(0, 10) : "—";

  // Refresh payout whenever version bumps (after dispatch)
  useEffect(() => {
    if (!token) return;
    getAgentPayout(token).then(onPayoutChange).catch(() => { /* non-blocking */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  async function toggleDetails() {
    const next = !showDetails;
    setShowDetails(next);
    if (next && !details) {
      try {
        const d = await getAgentPayout(token, true);
        setDetails(d.details ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "خطأ");
      }
    }
  }

  return (
    <div className="border-b border-[#11233c] bg-gradient-to-l from-[#0B1724] to-[#12325f] text-white">
      <div className="mx-auto max-w-[1280px] px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-amber-300" />
            <h2 className="text-base font-black">مستحقاتي</h2>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-black ${isPaid ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
            {isPaid ? "مدفوع" : "غير مدفوع"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-white/60">طلبات مؤكدة ومرسلة</p>
            <p className="mt-1 text-2xl font-black">{payout.orders_count.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-white/60">العمولة / طلب</p>
            <p className="mt-1 text-2xl font-black">{payout.commission_per_order} <span className="text-sm">MAD</span></p>
          </div>
          <div className="rounded-2xl bg-amber-400/15 p-3 ring-1 ring-amber-300/30 sm:col-span-1 col-span-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-amber-200">المجموع المستحق</p>
            <p className="mt-1 text-2xl font-black text-amber-300">{formatMad(payout.total_due_mad)}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-white/60">
            آخر تصفية: <span className="font-black text-white/90">{lastReset}</span>
          </span>
          <button
            onClick={() => void toggleDetails()}
            className="ms-auto flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-xs font-black hover:bg-white/25"
          >
            <ListChecks className="h-3.5 w-3.5" />
            تفاصيل الحساب
          </button>
        </div>

        {error ? <p className="mt-2 rounded-xl bg-rose-500/20 px-3 py-2 text-xs font-bold text-rose-200">{error}</p> : null}

        {showDetails && (
          <div className="mt-3 max-h-64 overflow-auto rounded-2xl bg-white/5">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0B1724] text-white/60">
                <tr>
                  <th className="px-3 py-2 text-start font-black">الطلب</th>
                  <th className="px-3 py-2 text-start font-black">الزبون</th>
                  <th className="px-3 py-2 text-start font-black">أُرسل</th>
                  <th className="px-3 py-2 text-end font-black">العمولة</th>
                </tr>
              </thead>
              <tbody>
                {(details ?? []).map((d) => (
                  <tr key={String(d.order_id)} className="border-t border-white/10">
                    <td className="px-3 py-2 font-bold">{d.public_order_number}</td>
                    <td className="px-3 py-2">{d.customer_name}</td>
                    <td className="px-3 py-2 text-white/70">{d.dispatched_at ? String(d.dispatched_at).slice(0, 10) : "—"}</td>
                    <td className="px-3 py-2 text-end font-black text-amber-300">{d.commission_mad} MAD</td>
                  </tr>
                ))}
                {details && !details.length ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-white/60">ماكاين حتى طلب من آخر تصفية.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CallCard({
  order, token, dispatchMode, blacklistMode, selected, onToggleSelect, onSaved, onError,
}: {
  order: AdminOrder;
  token: string;
  dispatchMode: boolean;
  blacklistMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onSaved: (order: AdminOrder) => void;
  onError: (msg: string) => void;
}) {
  const [disposition, setDisposition] = useState<string>("");
  const [name, setName] = useState(order.customer_name);
  const [phone, setPhone] = useState(order.phone_local || order.phone_e164);
  const [qty, setQty] = useState(order.hero_qty);
  const [total, setTotal] = useState(order.total_mad);
  const [address, setAddress] = useState(order.address ?? "");
  const [city, setCity] = useState(matchCity(order.delivery_city || order.city));
  const [note, setNote] = useState(order.call_note ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const phoneDigits = useMemo(() => order.phone_e164.replace(/[^0-9]/g, ""), [order.phone_e164]);
  const product = displayProductName(order);

  const detailsChanged =
    name.trim() !== order.customer_name ||
    (blacklistMode && phone.trim() !== (order.phone_local || order.phone_e164)) ||
    qty !== order.hero_qty ||
    total !== order.total_mad ||
    address.trim() !== (order.address ?? "") ||
    city !== matchCity(order.delivery_city || order.city);

  function pickOffer(offerQty: number, price: number) { setQty(offerQty); setTotal(price); }

  async function save() {
    if (saving) return;
    if (!disposition && !detailsChanged) return;
    setSaving(true); setSaved(false);
    try {
      let updated = order;
      if (detailsChanged) {
        if (blacklistMode && !isValidMoroccoMobile(phone)) {
          throw new Error("دخل رقم هاتف مغربي صحيح.");
        }
        updated = await agentEditOrder(token, order.id, {
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
        updated = await agentUpdateOrderCall(token, order.id, {
          call_status: apiStatus, call_note: note,
          delivery_company: disposition === "confirmed" ? DELIVERY_COMPANY : undefined,
          delivery_city: disposition === "confirmed" ? city : undefined,
        });
      }
      setSaved(true);
      onSaved(updated);
    } catch (err) { onError(errMsg(err)); }
    finally { setSaving(false); }
  }

  return (
    <div className={`rounded-[26px] border bg-white p-5 shadow-sm ${selected ? "border-[#16A34A] ring-2 ring-emerald-200" : "border-gray-100"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {dispatchMode && (
            <input type="checkbox" checked={selected} onChange={onToggleSelect} className="mt-1 h-5 w-5 accent-[#16A34A]" />
          )}
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
            <p className="mt-1 text-xs font-black text-amber-600">{order.call_attempts} محاولات</p>
          ) : null}
        </div>
      </div>

      {order.delivery_tracking ? (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
          تسيفط لـ {order.delivery_company || DELIVERY_COMPANY} · {order.delivery_tracking}
        </p>
      ) : null}
      {order.delivery_error ? (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700">
          فشل الإرسال: {formatDeliveryError(order.delivery_error, order)}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <a href={`tel:${order.phone_e164}`} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#1E4A8C] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#173B70]">
          <Phone className="h-4 w-4" />
          اتصل
        </a>
        <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#16A34A] px-4 py-2.5 text-sm font-black text-white transition hover:bg-green-700">
          WhatsApp
        </a>
      </div>

      {/* Customer + offer */}
      <div className="mt-4 space-y-3 rounded-2xl bg-[#F8FAFD] p-4">
        <div>
          <label className="mb-1 block text-[11px] font-black text-[#667085]">الزبون</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#1E4A8C]" />
        </div>
        {blacklistMode && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-3">
            <label className="mb-1 block text-[11px] font-black text-red-700">تعديل رقم الهاتف</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              inputMode="tel"
              placeholder="0612345678"
              className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-black outline-none focus:border-red-500"
            />
            <p className="mt-1 text-[11px] font-bold text-red-700">متاح فقط فـ Blacklist باش تصلح الرقم المرفوض من Digylog.</p>
          </div>
        )}
        <div>
          <label className="mb-1 block text-[11px] font-black text-[#667085]">العرض</label>
          <div className="flex flex-wrap gap-2">
            {HERO_OFFERS.map((offer) => (
              <button key={offer.id} onClick={() => pickOffer(offer.qty, offer.priceMad)}
                className={`rounded-full px-3 py-1.5 text-xs font-black transition ${qty === offer.qty ? "bg-[#1E4A8C] text-white" : "bg-white text-[#667085] border border-gray-200"}`}>
                {offer.sublabel} · {offer.priceMad}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-black text-[#667085]">الكمية</label>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#1E4A8C]" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-black text-[#667085]">المجموع (درهم)</label>
            <input type="number" min={0} value={total} onChange={(e) => setTotal(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#1E4A8C]" />
          </div>
        </div>
      </div>

      {/* Address + city */}
      <div className="mt-3 space-y-3 rounded-2xl bg-[#F8FAFD] p-4">
        <div>
          <label className="mb-1 block text-[11px] font-black text-[#667085]">العنوان</label>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2}
            placeholder="الشارع، الحي..."
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#1E4A8C]" />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-2 text-[11px] font-black text-[#1E4A8C]">
            <Truck className="h-3.5 w-3.5" />
            مدينة {DELIVERY_COMPANY}
          </label>
          <CitySelect value={city} onChange={setCity} />
        </div>
      </div>

      {/* Disposition */}
      <div className="mt-3">
        <p className="mb-2 text-xs font-black text-[#667085]">نتيجة المكالمة</p>
        <div className="flex flex-wrap gap-2">
          {CALL_STATUSES.map((item) => (
            <button key={item.value} onClick={() => setDisposition(item.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition ${disposition === item.value ? item.tone : item.soft}`}>
              {item.ar}
            </button>
          ))}
        </div>
      </div>

      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
        placeholder="ملاحظة (اختياري)"
        className="mt-3 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#1E4A8C]" />

      <button onClick={() => void save()} disabled={(!disposition && !detailsChanged) || saving}
        className="mt-4 w-full rounded-full bg-[#102033] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1E4A8C] disabled:cursor-not-allowed disabled:opacity-50">
        {saving ? "كيتسجل..." : saved ? "تسجل ✓" : disposition === "confirmed" ? "تأكيد وحفظ" : disposition ? "تسجيل النتيجة" : "حفظ التعديلات"}
      </button>
    </div>
  );
}

function CitySelect({ value, onChange }: { value: string; onChange: (city: string) => void }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  useEffect(() => { setQuery(value); }, [value]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle ? DIGYLOG_CITIES.filter((c) => c.toLowerCase().includes(needle)) : DIGYLOG_CITIES;
    return list.slice(0, 30);
  }, [query]);

  return (
    <div className="relative">
      <input value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="كتب اسم المدينة..."
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#1E4A8C]" />
      {open && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {matches.length ? matches.map((c) => (
            <li key={c}>
              <button type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange(c); setQuery(c); setOpen(false); }}
                className={`block w-full px-3 py-2 text-start text-sm font-semibold transition hover:bg-[#EEF5FF] ${c === value ? "bg-[#EEF5FF] text-[#1E4A8C]" : "text-[#102033]"}`}>
                {c}
              </button>
            </li>
          )) : (
            <li className="px-3 py-2 text-sm font-semibold text-[#94A3B8]">ماكاينة</li>
          )}
        </ul>
      )}
    </div>
  );
}
