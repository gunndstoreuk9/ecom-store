"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, BarChart3, Eye, EyeOff, ListChecks, Lock,
  Pencil, Plus, RefreshCw, RotateCcw, ShieldCheck, ShieldOff,
  Trash2, Wallet, History,
} from "lucide-react";
import {
  AgentResponse,
  AgentStats,
  ConfirmationPayout,
  ApiError,
  adminListAgents,
  adminCreateAgent,
  adminUpdateAgent,
  adminDeleteAgent,
  adminGetAllAgentStats,
  adminGetAgentPayout,
  adminResetAgentPayout,
  adminAssignHistoricalOrders,
} from "@/lib/api";
import { formatMad } from "@/lib/currency";

const ADMIN_KEY_STORAGE = "tawazon_admin_key";
const SUPPORTED_SKUS = [
  { value: "american-sugar-balance-complex", label: "المركّب الأمريكي لضبط السكر" },
  { value: "miracle-men-oil", label: "الدهان الأمريكي المعجزة للرجال" },
  { value: "HOYGI22-MAROC11", label: "سيرم علاج التجاعيد Hoygi" },
  { value: "NOVAMAN2026", label: "Nova Man الأمريكي للرجال" },
];
const AUTO_REFRESH_MS = 60_000;

type Modal =
  | { type: "create" }
  | { type: "edit"; agent: AgentResponse }
  | { type: "delete"; agent: AgentResponse }
  | { type: "payout"; agent: AgentResponse }
  | null;

function errMsg(e: unknown) {
  return e instanceof ApiError ? e.message : e instanceof Error ? e.message : "خطأ";
}

export default function AgentsAdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [stats, setStats] = useState<AgentStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [showStats, setShowStats] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Form state
  const [fUsername, setFUsername] = useState("");
  const [fPassword, setFPassword] = useState("");
  const [fDisplayName, setFDisplayName] = useState("");
  const [fSkus, setFSkus] = useState<string[]>([]);
  const [fStatus, setFStatus] = useState<"active" | "inactive">("active");
  const [fSaving, setFSaving] = useState(false);
  const [fError, setFError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    const k = localStorage.getItem(ADMIN_KEY_STORAGE) || "";
    setSavedKey(k);
  }, []);

  const load = async (key: string, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [agentsData, statsData] = await Promise.all([
        adminListAgents(key),
        adminGetAllAgentStats(key, 30),
      ]);
      setAgents(agentsData);
      setStats(statsData);
      setLastRefresh(new Date());
    } catch (e) {
      setError(errMsg(e));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const k = adminKey.trim();
    if (!k) return;
    localStorage.setItem(ADMIN_KEY_STORAGE, k);
    setSavedKey(k);
    void load(k);
  };

  useEffect(() => {
    if (!savedKey) return;
    void load(savedKey);
    intervalRef.current = setInterval(() => void load(savedKey, true), AUTO_REFRESH_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  const openCreate = () => {
    setFUsername(""); setFPassword(""); setFDisplayName(""); setFSkus([]); setFStatus("active"); setFError(null); setShowPass(false);
    setModal({ type: "create" });
  };
  const openEdit = (agent: AgentResponse) => {
    setFDisplayName(agent.display_name); setFPassword(""); setFSkus(agent.allowed_skus || []);
    setFStatus(agent.status); setFError(null); setShowPass(false);
    setModal({ type: "edit", agent });
  };

  const handleSaveCreate = async () => {
    if (!fUsername.trim() || !fPassword.trim() || !fDisplayName.trim()) {
      setFError("الاسم، اسم المستخدم، وكلمة المرور إلزامية"); return;
    }
    setFSaving(true); setFError(null);
    try {
      await adminCreateAgent(savedKey, { username: fUsername.trim(), password: fPassword.trim(), display_name: fDisplayName.trim(), allowed_skus: fSkus.length > 0 ? fSkus : null });
      setModal(null); void load(savedKey);
    } catch (e) { setFError(errMsg(e)); }
    finally { setFSaving(false); }
  };

  const handleSaveEdit = async () => {
    if (modal?.type !== "edit") return;
    setFSaving(true); setFError(null);
    try {
      await adminUpdateAgent(savedKey, modal.agent.id, { display_name: fDisplayName.trim() || undefined, password: fPassword.trim() || undefined, status: fStatus, allowed_skus: fSkus.length > 0 ? fSkus : null, clear_skus: fSkus.length === 0 });
      setModal(null); void load(savedKey);
    } catch (e) { setFError(errMsg(e)); }
    finally { setFSaving(false); }
  };

  const handleDelete = async () => {
    if (modal?.type !== "delete") return;
    setFSaving(true); setFError(null);
    try { await adminDeleteAgent(savedKey, modal.agent.id); setModal(null); void load(savedKey); }
    catch (e) { setFError(errMsg(e)); }
    finally { setFSaving(false); }
  };

  const getStats = (agentId: string): AgentStats | undefined => stats.find((s) => s.agent_id === agentId);
  const toggleSku = (sku: string) => setFSkus((prev) => prev.includes(sku) ? prev.filter((s) => s !== sku) : [...prev, sku]);

  if (!savedKey) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <form onSubmit={handleKeySubmit} className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-sm space-y-4">
          <h1 className="text-white text-xl font-bold text-center">مفتاح الإدارة</h1>
          <input type="password" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} placeholder="ADMIN_API_KEY"
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 font-semibold transition">دخول</button>
        </form>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 px-4 py-4 flex items-center gap-3">
        <Link href="/admin" className="text-slate-400 hover:text-white transition"><ArrowLeft className="w-5 h-5 rotate-180" /></Link>
        <h1 className="text-lg font-bold flex-1">إدارة الموظفات</h1>
        <span className="text-xs text-slate-500 hidden sm:block">
          {lastRefresh ? `آخر تحديث: ${lastRefresh.toLocaleTimeString("ar-MA")}` : ""} · يتحدث كل دقيقة
        </span>
        <button onClick={() => setShowStats(!showStats)} className="text-slate-400 hover:text-white transition p-2" title="إظهار/إخفاء">
          <BarChart3 className="w-5 h-5" />
        </button>
        <button onClick={() => void load(savedKey)} className="text-slate-400 hover:text-white transition p-2">
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
          <Plus className="w-4 h-4" />موظفة جديدة
        </button>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {error && <div className="bg-rose-900/30 border border-rose-700 rounded-xl p-4 text-rose-300 text-sm">{error}</div>}
        {loading && agents.length === 0 && <div className="text-center text-slate-400 py-12">جاري التحميل...</div>}

        {/* Live Dashboard Cards */}
        {showStats && stats.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wide">لوحة الأداء المباشر</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {stats.map((s) => (
                <AgentDashboardCard
                  key={s.agent_id}
                  stats={s}
                  adminKey={savedKey}
                  onPayoutClick={() => {
                    const agent = agents.find((a) => a.id === s.agent_id);
                    if (agent) setModal({ type: "payout", agent });
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Agents Table */}
        <div>
          <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wide">قائمة الموظفات</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {agents.length === 0 && !loading ? (
              <div className="text-center text-slate-400 py-12">لا توجد موظفات بعد. أضف أول موظفة.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="text-right text-slate-400 font-medium px-4 py-3">الموظفة</th>
                    <th className="text-right text-slate-400 font-medium px-4 py-3 hidden sm:table-cell">المستخدم</th>
                    <th className="text-center text-slate-400 font-medium px-4 py-3">الحالة</th>
                    <th className="text-center text-slate-400 font-medium px-4 py-3 hidden sm:table-cell">التأكيد</th>
                    <th className="text-center text-slate-400 font-medium px-4 py-3 hidden md:table-cell">جديد</th>
                    <th className="text-center text-slate-400 font-medium px-4 py-3 hidden md:table-cell">متابعة</th>
                    <th className="text-center text-slate-400 font-medium px-4 py-3 hidden md:table-cell">مرسل</th>
                    <th className="text-center text-slate-400 font-medium px-4 py-3">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {agents.map((agent) => {
                    const s = getStats(agent.id);
                    return (
                      <tr key={agent.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-white">{agent.display_name}</div>
                          {agent.allowed_skus && agent.allowed_skus.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {agent.allowed_skus.map((sku) => (
                                <span key={sku} className="text-[10px] bg-indigo-900/40 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-700/40">
                                  {SUPPORTED_SKUS.find((x) => x.value === sku)?.label.split(" ")[0] ?? sku}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 hidden sm:table-cell text-slate-400 font-mono text-xs">{agent.username}</td>
                        <td className="px-4 py-4 text-center">
                          {agent.status === "active" ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-900/40 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-700/50">
                              <ShieldCheck className="w-3 h-3" /> نشطة
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-700/40 text-slate-400 text-xs px-2.5 py-1 rounded-full border border-slate-600/50">
                              <ShieldOff className="w-3 h-3" /> موقوفة
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center hidden sm:table-cell">
                          {s ? <span className={`font-bold text-sm ${s.confirmation_rate >= 60 ? "text-emerald-400" : s.confirmation_rate >= 40 ? "text-amber-400" : "text-rose-400"}`}>{s.confirmation_rate.toFixed(0)}%</span> : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-4 text-center hidden md:table-cell">
                          {s ? <span className="text-amber-400 font-bold">{s.new_count}</span> : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-4 text-center hidden md:table-cell">
                          {s ? <span className="text-blue-400 font-bold">{s.follow_up_count}</span> : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-4 text-center hidden md:table-cell">
                          {s ? <span className="text-emerald-400 font-bold">{s.dispatched_count}</span> : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => openEdit(agent)} className="text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-slate-700" title="تعديل">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => setModal({ type: "payout", agent })} className="text-amber-400 hover:text-amber-300 transition p-1.5 rounded-lg hover:bg-amber-900/20" title="المستحقات">
                              <Wallet className="w-4 h-4" />
                            </button>
                            <button
                              title="تحويل الطلبات القديمة غير المسندة لهذه الموظفة"
                              disabled={assigningId === agent.id}
                              onClick={async () => {
                                if (!confirm(`تحويل كل الطلبات غير المسندة لـ ${agent.display_name}؟`)) return;
                                setAssigningId(agent.id);
                                try {
                                  const r = await adminAssignHistoricalOrders(savedKey, agent.id);
                                  alert(`✅ تم تحويل ${r.updated_orders} طلب لـ ${agent.display_name}`);
                                  void load(savedKey);
                                } catch (e) {
                                  alert("خطأ: " + errMsg(e));
                                } finally {
                                  setAssigningId(null);
                                }
                              }}
                              className="text-sky-400 hover:text-sky-300 transition p-1.5 rounded-lg hover:bg-sky-900/20 disabled:opacity-40"
                            >
                              {assigningId === agent.id
                                ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400" />
                                : <History className="w-4 h-4" />}
                            </button>
                            <button onClick={() => { setFError(null); setModal({ type: "delete", agent }); }} className="text-slate-400 hover:text-rose-400 transition p-1.5 rounded-lg hover:bg-rose-900/20" title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

            {/* Create / Edit */}
            {(modal.type === "create" || modal.type === "edit") && (
              <>
                <h2 className="text-lg font-bold text-white">{modal.type === "create" ? "إضافة موظفة جديدة" : `تعديل: ${modal.agent.display_name}`}</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">الاسم الكامل</label>
                    <input value={fDisplayName} onChange={(e) => setFDisplayName(e.target.value)} placeholder="مثال: فاطمة الزهراء"
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  {modal.type === "create" && (
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">اسم المستخدم</label>
                      <input value={fUsername} onChange={(e) => setFUsername(e.target.value)} placeholder="مثال: fatima" dir="ltr"
                        className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">كلمة المرور {modal.type === "edit" && <span className="text-slate-500">(فارغة = بلا تغيير)</span>}</label>
                    <div className="relative">
                      <input type={showPass ? "text" : "password"} value={fPassword} onChange={(e) => setFPassword(e.target.value)} placeholder="6 أحرف على الأقل" dir="ltr"
                        className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {modal.type === "edit" && (
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">الحالة</label>
                      <div className="flex gap-2">
                        {(["active", "inactive"] as const).map((s) => (
                          <button key={s} onClick={() => setFStatus(s)}
                            className={`flex-1 py-2 rounded-xl text-sm font-medium transition border ${fStatus === s ? (s === "active" ? "bg-emerald-700 border-emerald-600 text-white" : "bg-slate-700 border-slate-600 text-white") : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                            {s === "active" ? "نشطة" : "موقوفة"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">المنتجات المسموح بها <span className="text-slate-500">(فارغ = كل المنتجات)</span></label>
                    <div className="space-y-2">
                      {SUPPORTED_SKUS.map((sku) => (
                        <button key={sku.value} onClick={() => toggleSku(sku.value)}
                          className={`w-full text-right px-4 py-3 rounded-xl text-sm border transition ${fSkus.includes(sku.value) ? "bg-indigo-900/40 border-indigo-600 text-indigo-200" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                          {sku.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {fError && <p className="text-rose-400 text-sm bg-rose-900/20 p-3 rounded-xl">{fError}</p>}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setModal(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 font-medium transition">إلغاء</button>
                  <button onClick={modal.type === "create" ? handleSaveCreate : handleSaveEdit} disabled={fSaving}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-xl py-3 font-semibold transition">
                    {fSaving ? "جاري الحفظ..." : "حفظ"}
                  </button>
                </div>
              </>
            )}

            {/* Delete */}
            {modal.type === "delete" && (
              <>
                <h2 className="text-lg font-bold text-white">حذف موظفة</h2>
                <p className="text-slate-300">هل أنت متأكد من حذف <span className="text-white font-semibold">{modal.agent.display_name}</span>؟ سيتم إلغاء تعيين طلباتها.</p>
                {fError && <p className="text-rose-400 text-sm">{fError}</p>}
                <div className="flex gap-3">
                  <button onClick={() => setModal(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 font-medium transition">إلغاء</button>
                  <button onClick={handleDelete} disabled={fSaving} className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white rounded-xl py-3 font-semibold transition">
                    {fSaving ? "جاري الحذف..." : "حذف"}
                  </button>
                </div>
              </>
            )}

            {/* Payout */}
            {modal.type === "payout" && (
              <PayoutModal agent={modal.agent} adminKey={savedKey} onClose={() => setModal(null)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live Dashboard Card per agent
// ---------------------------------------------------------------------------
function AgentDashboardCard({ stats: s, onPayoutClick }: { stats: AgentStats; adminKey: string; onPayoutClick: () => void }) {
  const rateColor = s.confirmation_rate >= 60 ? "text-emerald-400" : s.confirmation_rate >= 40 ? "text-amber-400" : "text-rose-400";

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-bold text-white text-sm">{s.display_name}</p>
          <p className="text-xs text-slate-500 font-mono">{s.username}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-2xl font-black ${rateColor}`}>{s.confirmation_rate.toFixed(0)}%</span>
          <button onClick={onPayoutClick} className="text-amber-400 hover:text-amber-300 p-1 rounded-lg hover:bg-amber-900/20 transition" title="المستحقات">
            <Wallet className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Queue stats */}
      <div className="grid grid-cols-4 gap-1.5 text-center">
        <div className="bg-slate-800 rounded-xl py-2">
          <p className="text-[10px] text-slate-500 font-bold">جديد</p>
          <p className="text-base font-black text-amber-400">{s.new_count}</p>
        </div>
        <div className="bg-slate-800 rounded-xl py-2">
          <p className="text-[10px] text-slate-500 font-bold">متابعة</p>
          <p className="text-base font-black text-blue-400">{s.follow_up_count}</p>
        </div>
        <div className="bg-slate-800 rounded-xl py-2">
          <p className="text-[10px] text-slate-500 font-bold">للإرسال</p>
          <p className="text-base font-black text-violet-400">{s.confirmed_queue}</p>
        </div>
        <div className="bg-slate-800 rounded-xl py-2">
          <p className="text-[10px] text-slate-500 font-bold">أُرسل</p>
          <p className="text-base font-black text-emerald-400">{s.dispatched_count}</p>
        </div>
      </div>

      {/* Performance row */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{s.total_assigned} طلب · {s.pending_open} مفتوح</span>
        {s.avg_response_minutes != null && <span>⏱ {s.avg_response_minutes}د</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payout modal with per-agent reset
// ---------------------------------------------------------------------------
function PayoutModal({ agent, adminKey, onClose }: { agent: AgentResponse; adminKey: string; onClose: () => void }) {
  const [payout, setPayout] = useState<ConfirmationPayout | null>(null);
  const [loadingPayout, setLoadingPayout] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState<ConfirmationPayout["details"]>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    adminGetAgentPayout(adminKey, agent.id)
      .then(setPayout)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoadingPayout(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleDetails() {
    const next = !showDetails;
    setShowDetails(next);
    if (next && !details) {
      try { const d = await adminGetAgentPayout(adminKey, agent.id, true); setDetails(d.details ?? []); }
      catch (e) { setError(errMsg(e)); }
    }
  }

  async function doReset() {
    if (!pin) return;
    setResetting(true); setError(null);
    try {
      const updated = await adminResetAgentPayout(adminKey, agent.id, pin);
      setPayout(updated);
      setDetails(null);
      setShowDetails(false);
      setPinOpen(false);
      setPin("");
    } catch (e) { setError(errMsg(e)); }
    finally { setResetting(false); }
  }

  const isPaid = payout?.status === "paid";
  const lastReset = payout?.last_reset_at ? payout.last_reset_at.slice(0, 10) : "—";

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">مستحقات {agent.display_name}</h2>
        </div>
        {payout && (
          <span className={`rounded-full px-3 py-1 text-xs font-black ${isPaid ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
            {isPaid ? "مدفوع" : "غير مدفوع"}
          </span>
        )}
      </div>

      {loadingPayout && <div className="text-center text-slate-400 py-6">جاري التحميل...</div>}

      {payout && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800 rounded-2xl p-3 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-bold">طلبات مرسلة</p>
              <p className="text-2xl font-black text-white mt-1">{payout.orders_count}</p>
            </div>
            <div className="bg-slate-800 rounded-2xl p-3 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-bold">العمولة/طلب</p>
              <p className="text-2xl font-black text-white mt-1">{payout.commission_per_order} <span className="text-sm">MAD</span></p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-center">
              <p className="text-[10px] text-amber-400 uppercase font-bold">المجموع</p>
              <p className="text-2xl font-black text-amber-300 mt-1">{formatMad(payout.total_due_mad)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>آخر تصفية: <span className="text-white font-bold">{lastReset}</span></span>
            <div className="flex gap-2">
              <button onClick={() => void toggleDetails()} className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-full text-xs font-bold transition">
                <ListChecks className="w-3.5 h-3.5" /> تفاصيل
              </button>
              <button onClick={() => setPinOpen((v) => !v)} className="flex items-center gap-1 bg-rose-600 hover:bg-rose-500 px-3 py-1.5 rounded-full text-xs font-bold text-white transition">
                <RotateCcw className="w-3.5 h-3.5" /> تصفية
              </button>
            </div>
          </div>

          {pinOpen && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-800 rounded-2xl p-3">
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-300">PIN الأدمين لتأكيد التصفية</span>
              <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" dir="ltr"
                className="flex-1 min-w-[80px] bg-slate-700 rounded-lg px-3 py-1.5 text-sm font-black text-white outline-none" />
              <button onClick={() => void doReset()} disabled={resetting || !pin}
                className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-full text-xs font-black transition">
                {resetting ? "جاري..." : "تأكيد"}
              </button>
              <button onClick={() => { setPinOpen(false); setPin(""); }} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded-full text-xs font-black transition">إلغاء</button>
            </div>
          )}

          {showDetails && (
            <div className="max-h-56 overflow-auto rounded-2xl bg-slate-800">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-start font-black">الطلب</th>
                    <th className="px-3 py-2 text-start font-black">الزبون</th>
                    <th className="px-3 py-2 text-start font-black">أُرسل</th>
                    <th className="px-3 py-2 text-end font-black">العمولة</th>
                  </tr>
                </thead>
                <tbody>
                  {(details ?? []).map((d) => (
                    <tr key={String(d.order_id)} className="border-t border-slate-700">
                      <td className="px-3 py-2 font-bold text-white">{d.public_order_number}</td>
                      <td className="px-3 py-2 text-slate-300">{d.customer_name}</td>
                      <td className="px-3 py-2 text-slate-400">{d.dispatched_at ? String(d.dispatched_at).slice(0, 10) : "—"}</td>
                      <td className="px-3 py-2 text-end font-black text-amber-400">{d.commission_mad} MAD</td>
                    </tr>
                  ))}
                  {details && !details.length && (
                    <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-500">ماكاين حتى طلب من آخر تصفية.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {error && <p className="text-rose-400 text-sm bg-rose-900/20 p-3 rounded-xl">{error}</p>}

      <button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 font-medium transition">إغلاق</button>
    </>
  );
}
