"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  RefreshCw,
  BarChart3,
  LogOut,
  Search,
} from "lucide-react";
import {
  AdminOrder,
  AgentSession,
  AgentStats,
  ApiError,
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
  { value: "confirmed", ar: "مؤكد", tone: "bg-emerald-600 text-white", soft: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "no_answer", ar: "لا يجيب", tone: "bg-amber-500 text-white", soft: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "voicemail", ar: "صندوق صوتي", tone: "bg-orange-500 text-white", soft: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "annule", ar: "ملغى", tone: "bg-rose-600 text-white", soft: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "wrong_number", ar: "رقم خاطئ", tone: "bg-red-600 text-white", soft: "bg-red-50 text-red-700 border-red-200" },
  { value: "busy", ar: "مشغول", tone: "bg-yellow-500 text-white", soft: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { value: "duplicate", ar: "طلب مكرر", tone: "bg-slate-600 text-white", soft: "bg-slate-100 text-slate-700 border-slate-300" },
] as const;

const CALL_VALUE_TO_API: Record<string, string> = { annule: "cancelled" };

type TabValue = "new" | "follow_up" | "confirmed" | "all";

const TABS: { value: TabValue; ar: string }[] = [
  { value: "new", ar: "جديدة" },
  { value: "follow_up", ar: "للمتابعة" },
  { value: "confirmed", ar: "مؤكدة" },
  { value: "all", ar: "الكل" },
];

function matchCity(city?: string | null): string {
  if (!city) return "";
  return cleanCityName(city);
}

function displayProductName(order: AdminOrder): string {
  const SKU_NAMES: Record<string, string> = {
    "american-sugar-balance-complex": "المركّب الأمريكي لضبط السكر",
    "miracle-men-oil": "الدهان الأمريكي المعجزة للرجال",
  };
  return SKU_NAMES[order.hero_sku] ?? order.hero_sku;
}

export default function AgentWorkspacePage() {
  const router = useRouter();
  const [session, setSession] = useState<AgentSession | null>(null);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [counts, setCounts] = useState({ new: 0, follow_up: 0, confirmed: 0 });
  const [tab, setTab] = useState<TabValue>("new");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);

  // Load session on mount
  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      router.replace("/call-center/login");
      return;
    }
    try {
      const s = JSON.parse(raw) as AgentSession;
      if (!s?.token) throw new Error("no token");
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
    void loadStats(session.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, tab]);

  async function loadOrders(token: string) {
    setLoading(true);
    setError(null);
    try {
      const bucket = tab !== "all" ? tab : undefined;
      const result = await getAgentOrders(token, { limit: 200, q: query, bucket });
      setOrders(result.orders);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        handleLogout();
        return;
      }
      setError(e instanceof ApiError ? e.message : "فشل التحميل");
    } finally {
      setLoading(false);
    }
  }

  async function loadCounts(token: string) {
    try {
      const [n, f, c] = await Promise.all([
        getAgentOrders(token, { limit: 1, bucket: "new" }),
        getAgentOrders(token, { limit: 1, bucket: "follow_up" }),
        getAgentOrders(token, { limit: 1, bucket: "confirmed" }),
      ]);
      setCounts({ new: n.total, follow_up: f.total, confirmed: c.total });
    } catch {
      // non-blocking
    }
  }

  async function loadStats(token: string) {
    try {
      setStats(await getAgentMe(token));
    } catch {
      // non-blocking
    }
  }

  function onSaved(updated: AdminOrder) {
    if (session) void loadCounts(session.token);
    setOrders((current) => {
      if ((tab === "new" || tab === "follow_up") && updated.status !== "new") {
        return current.filter((o) => o.id !== updated.id);
      }
      return current.map((o) => (o.id === updated.id ? updated : o));
    });
  }

  async function handleLogout() {
    if (session) {
      try { await agentLogout(session.token); } catch { /* ignore */ }
    }
    localStorage.removeItem(SESSION_KEY);
    router.replace("/call-center/login");
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (session) void loadOrders(session.token);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F5F7FB] text-[#102033]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-l from-[#0B1724] to-[#1E4A8C] text-white shadow-lg">
        <div className="mx-auto max-w-[1280px] px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-base leading-none">{session.display_name}</p>
              <p className="text-xs text-white/60 mt-0.5">مركز الاتصال</p>
            </div>

            {/* Stats toggle */}
            <button
              onClick={() => setShowStats(!showStats)}
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition"
              title="الإحصائيات"
            >
              <BarChart3 className="w-4 h-4" />
            </button>

            {/* Refresh */}
            <button
              onClick={() => { void loadOrders(session.token); void loadCounts(session.token); }}
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="h-9 px-3 flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-rose-500/40 transition text-xs font-bold"
            >
              <LogOut className="w-4 h-4" />
              خروج
            </button>
          </div>

          {/* Stats mini panel */}
          {showStats && stats && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
                <p className="text-xs text-white/60">نسبة التأكيد</p>
                <p className="text-lg font-black text-emerald-300">{stats.confirmation_rate.toFixed(0)}%</p>
              </div>
              <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
                <p className="text-xs text-white/60">إجمالي الطلبات</p>
                <p className="text-lg font-black">{stats.total_assigned}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
                <p className="text-xs text-white/60">مؤكدة</p>
                <p className="text-lg font-black text-emerald-300">{stats.confirmed}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
                <p className="text-xs text-white/60">متوسط الرد</p>
                <p className="text-lg font-black">
                  {stats.avg_response_minutes != null ? `${stats.avg_response_minutes}د` : "—"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {TABS.map((t) => {
              const count = counts[t.value as keyof typeof counts];
              return (
                <button
                  key={t.value}
                  onClick={() => setTab(t.value)}
                  className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-black transition whitespace-nowrap ${
                    tab === t.value
                      ? "bg-white text-[#1E4A8C]"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {t.ar}
                  {count > 0 && t.value !== "all" && (
                    <span className={`mr-1 rounded-full px-1.5 py-0.5 text-[10px] ${tab === t.value ? "bg-[#1E4A8C] text-white" : "bg-white/20"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6">
        <form onSubmit={handleSearch} className="max-w-[1280px] mx-auto flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالاسم، الهاتف، رقم الطلب..."
              className="w-full border border-gray-200 rounded-2xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E4A8C]/20 focus:border-[#1E4A8C]"
            />
          </div>
          <button type="submit" className="bg-[#1E4A8C] text-white px-4 py-2 rounded-2xl text-sm font-black">
            بحث
          </button>
        </form>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-[1280px] px-4 py-4 sm:px-6">
        {error && (
          <div className="mb-4 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-rose-700 text-sm font-semibold">
            {error}
          </div>
        )}

        {loading && orders.length === 0 && (
          <div className="text-center text-gray-400 py-16">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            جاري التحميل...
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="text-center text-gray-400 py-16">
            <Phone className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">لا توجد طلبات في هذه القائمة</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <AgentCallCard
              key={order.id}
              order={order}
              token={session.token}
              onSaved={onSaved}
              onError={(msg) => setError(msg)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function AgentCallCard({
  order,
  token,
  onSaved,
  onError,
}: {
  order: AdminOrder;
  token: string;
  onSaved: (order: AdminOrder) => void;
  onError: (msg: string) => void;
}) {
  const [disposition, setDisposition] = useState<string>("");
  const [city, setCity] = useState(matchCity(order.delivery_city || order.city));
  const [note, setNote] = useState(order.call_note ?? "");
  const [qty, setQty] = useState(order.hero_qty);
  const [total, setTotal] = useState(order.total_mad);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const product = displayProductName(order);
  const callStatusMeta = CALL_STATUSES.find((s) => s.value === order.call_status);

  function pickOffer(offerQty: number, price: number) {
    setQty(offerQty);
    setTotal(price);
  }

  async function save() {
    if (saving) return;
    if (!disposition) return;
    setSaving(true);
    setSaved(false);
    try {
      const apiStatus = CALL_VALUE_TO_API[disposition] ?? disposition;
      const updated = await agentUpdateOrderCall(token, order.id, {
        call_status: apiStatus,
        call_note: note,
        delivery_company: disposition === "confirmed" ? DELIVERY_COMPANY : undefined,
        delivery_city: disposition === "confirmed" ? city : undefined,
      });
      setSaved(true);
      setDisposition("");
      onSaved(updated);
    } catch (e) {
      onError(e instanceof ApiError ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`rounded-[26px] border bg-white p-5 shadow-sm transition-all ${saved ? "border-emerald-400 ring-2 ring-emerald-100" : "border-gray-100"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-[#1E4A8C]">{order.public_order_number}</p>
          <p className="text-sm font-bold text-[#102033]">{product}</p>
          <p className="mt-1 font-mono text-sm text-[#102033]" dir="ltr">{order.phone_e164}</p>
          <p className="text-sm text-[#667085]">{order.customer_name}</p>
        </div>
        <div className="text-end shrink-0">
          <p className="text-lg font-black text-[#1E4A8C]">{formatMad(total)}</p>
          <p className="text-xs font-bold text-[#667085]">x{qty}</p>
          {order.call_attempts > 0 && (
            <p className="mt-1 text-xs font-black text-amber-600">{order.call_attempts} محاولة</p>
          )}
        </div>
      </div>

      {/* City */}
      {order.city && (
        <p className="mt-2 text-xs text-[#667085]">
          {order.city}{order.address ? ` · ${order.address}` : ""}
        </p>
      )}

      {/* Previous call status */}
      {callStatusMeta && !saved && (
        <div className={`mt-2 rounded-xl border px-3 py-1.5 text-xs font-bold ${callStatusMeta.soft}`}>
          {callStatusMeta.ar}
          {order.call_note && <span className="mr-1 opacity-70">· {order.call_note}</span>}
        </div>
      )}

      {saved && (
        <div className="mt-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-black text-emerald-700">
          ✓ تم الحفظ بنجاح
        </div>
      )}

      {/* Offer picker (for confirmed) */}
      {disposition === "confirmed" && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-black text-[#667085] uppercase">اختار العرض</p>
          <div className="flex flex-wrap gap-2">
            {HERO_OFFERS.map((o) => (
              <button
                key={o.id}
                onClick={() => pickOffer(o.qty, o.priceMad)}
                className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                  qty === o.qty
                    ? "border-[#1E4A8C] bg-[#1E4A8C] text-white"
                    : "border-gray-200 bg-gray-50 text-[#667085] hover:border-[#1E4A8C]"
                }`}
              >
                {o.qty}x · {formatMad(o.priceMad)}
              </button>
            ))}
          </div>

          <p className="text-xs font-black text-[#667085] uppercase">مدينة التوصيل</p>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#1E4A8C]"
          >
            <option value="">اختار المدينة</option>
            {DIGYLOG_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {/* Note */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="ملاحظة (اختياري)"
        rows={2}
        className="mt-3 w-full resize-none rounded-2xl border border-gray-200 px-3 py-2 text-sm text-[#102033] placeholder-gray-400 focus:outline-none focus:border-[#1E4A8C]"
      />

      {/* Disposition buttons */}
      <div className="mt-3 flex flex-wrap gap-2">
        {CALL_STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setDisposition(disposition === s.value ? "" : s.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
              disposition === s.value ? s.tone : `border ${s.soft}`
            }`}
          >
            {s.ar}
          </button>
        ))}
      </div>

      {/* Save */}
      {disposition && (
        <button
          onClick={save}
          disabled={saving || (disposition === "confirmed" && !city)}
          className="mt-3 w-full rounded-2xl bg-[#1E4A8C] py-3 text-sm font-black text-white transition hover:bg-[#1a4280] disabled:opacity-50"
        >
          {saving ? "جاري الحفظ..." : "حفظ"}
        </button>
      )}

      {/* Phone call button */}
      <a
        href={`tel:${order.phone_e164}`}
        className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 py-2.5 text-sm font-black text-emerald-700 hover:bg-emerald-100 transition"
      >
        <Phone className="w-4 h-4" />
        {order.phone_local || order.phone_e164}
      </a>
    </div>
  );
}
