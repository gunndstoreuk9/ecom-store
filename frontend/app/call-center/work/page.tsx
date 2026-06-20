"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Download, LogOut, Phone, RefreshCw } from "lucide-react";
import {
  AdminOrder,
  AgentSession,
  AgentStats,
  ApiError,
  agentEditOrder,
  agentLogout,
  agentUpdateOrderCall,
  getAgentMe,
  getAgentOrders,
} from "@/lib/api";
import { formatMad } from "@/lib/currency";
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

type TabValue = "new" | "follow_up" | "confirmed" | "all";
type ProductFilter = "all" | "american-sugar-balance-complex" | "miracle-men-oil";

const TABS: { value: TabValue; ar: string }[] = [
  { value: "new", ar: "طلبات جديدة" },
  { value: "follow_up", ar: "للمتابعة" },
  { value: "confirmed", ar: "للإرسال" },
  { value: "all", ar: "الكل" },
];

const PRODUCT_FILTERS: { value: ProductFilter; ar: string; shortAr: string }[] = [
  { value: "all", ar: "كل المنتجات", shortAr: "الكل" },
  { value: "american-sugar-balance-complex", ar: "المركّب الأمريكي لضبط السكر", shortAr: "ضبط السكر" },
  { value: "miracle-men-oil", ar: "الدهان الأمريكي المعجزة للرجال", shortAr: "دهان الرجال" },
];

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
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [counts, setCounts] = useState({ new: 0, follow_up: 0, confirmed: 0 });
  const [productCounts, setProductCounts] = useState<Record<ProductFilter, number>>({ all: 0, "american-sugar-balance-complex": 0, "miracle-men-oil": 0 });
  const [tab, setTab] = useState<TabValue>("new");
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
      const result = await getAgentOrders(token, { limit: 200, q: query, bucket, ...(selectedProductSku ? { status: undefined } : {}) });
      // client-side product filter if needed
      const filtered = selectedProductSku ? result.orders.filter((o) => o.hero_sku === selectedProductSku) : result.orders;
      setOrders(filtered);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { handleLogout(); return; }
      setError(errMsg(e));
    } finally { setLoading(false); }
  }

  async function loadCounts(token: string) {
    try {
      const [n, f, c] = await Promise.all([
        getAgentOrders(token, { limit: 1, bucket: "new" }),
        getAgentOrders(token, { limit: 1, bucket: "follow_up" }),
        getAgentOrders(token, { limit: 1, bucket: "confirmed" }),
      ]);
      setCounts({ new: n.total, follow_up: f.total, confirmed: c.total });
    } catch { /* non-blocking */ }
  }

  async function loadProductCounts(token: string) {
    try {
      const bucket = tab !== "all" ? tab : undefined;
      const all = await getAgentOrders(token, { limit: 200, bucket });
      const cnt: Record<ProductFilter, number> = { all: all.total, "american-sugar-balance-complex": 0, "miracle-men-oil": 0 };
      for (const o of all.orders) {
        if (o.hero_sku === "american-sugar-balance-complex") cnt["american-sugar-balance-complex"]++;
        if (o.hero_sku === "miracle-men-oil") cnt["miracle-men-oil"]++;
      }
      setProductCounts(cnt);
    } catch { /* non-blocking */ }
  }

  async function loadStats(token: string) {
    try { setMyStats(await getAgentMe(token)); } catch { /* non-blocking */ }
  }

  function onSaved(updated: AdminOrder) {
    if (session) { void loadCounts(session.token); void loadProductCounts(session.token); void loadStats(session.token); }
    setOrders((cur) => {
      if ((tab === "new" || tab === "follow_up") && updated.status !== "new") {
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

  const isDispatch = tab === "confirmed";

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
              <p className="text-xs font-black uppercase tracking-wide text-white/70">مركز الاتصال</p>
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
              onClick={() => { void loadOrders(session.token); void loadCounts(session.token); void loadProductCounts(session.token); }}
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

      {/* My Stats Panel */}
      {showStats && myStats && (
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-[1280px] px-4 py-4 sm:px-6">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-[#667085]">إحصائياتي (30 يوم)</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                {badge ? (
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

function CallCard({
  order, token, dispatchMode, selected, onToggleSelect, onSaved, onError,
}: {
  order: AdminOrder;
  token: string;
  dispatchMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onSaved: (order: AdminOrder) => void;
  onError: (msg: string) => void;
}) {
  const [disposition, setDisposition] = useState<string>("");
  const [name, setName] = useState(order.customer_name);
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
        updated = await agentEditOrder(token, order.id, {
          customer_name: name.trim(), qty, total_mad: total,
          address: address.trim(), delivery_city: city,
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
          فشل الإرسال: {order.delivery_error}
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
          <label className="mb-1 block text-[11px] font-black text-[#1E4A8C]">مدينة {DELIVERY_COMPANY}</label>
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
