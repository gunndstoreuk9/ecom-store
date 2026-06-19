"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  ShieldOff,
  BarChart3,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import {
  AgentResponse,
  AgentStats,
  adminListAgents,
  adminCreateAgent,
  adminUpdateAgent,
  adminDeleteAgent,
  adminGetAllAgentStats,
  ApiError,
} from "@/lib/api";

const ADMIN_KEY_STORAGE = "tawazon_admin_key";
const SUPPORTED_SKUS = [
  { value: "american-sugar-balance-complex", label: "المركّب الأمريكي لضبط السكر" },
  { value: "miracle-men-oil", label: "الدهان الأمريكي المعجزة للرجال" },
];

type Modal =
  | { type: "create" }
  | { type: "edit"; agent: AgentResponse }
  | { type: "delete"; agent: AgentResponse }
  | null;

export default function AgentsAdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [stats, setStats] = useState<AgentStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [showStats, setShowStats] = useState(true);

  // Form state
  const [fUsername, setFUsername] = useState("");
  const [fPassword, setFPassword] = useState("");
  const [fDisplayName, setFDisplayName] = useState("");
  const [fSkus, setFSkus] = useState<string[]>([]);
  const [fStatus, setFStatus] = useState<"active" | "inactive">("active");
  const [fSaving, setFSaving] = useState(false);
  const [fError, setFError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const k = localStorage.getItem(ADMIN_KEY_STORAGE) || "";
    setSavedKey(k);
  }, []);

  const load = async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const [agentsData, statsData] = await Promise.all([
        adminListAgents(key),
        adminGetAllAgentStats(key, 30),
      ]);
      setAgents(agentsData);
      setStats(statsData);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "فشل التحميل");
    } finally {
      setLoading(false);
    }
  };

  const handleKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const k = adminKey.trim();
    if (!k) return;
    localStorage.setItem(ADMIN_KEY_STORAGE, k);
    setSavedKey(k);
    load(k);
  };

  useEffect(() => {
    if (savedKey) load(savedKey);
  }, [savedKey]);

  const openCreate = () => {
    setFUsername(""); setFPassword(""); setFDisplayName(""); setFSkus([]); setFStatus("active"); setFError(null); setShowPass(false);
    setModal({ type: "create" });
  };

  const openEdit = (agent: AgentResponse) => {
    setFDisplayName(agent.display_name);
    setFPassword("");
    setFSkus(agent.allowed_skus || []);
    setFStatus(agent.status);
    setFError(null);
    setShowPass(false);
    setModal({ type: "edit", agent });
  };

  const handleSaveCreate = async () => {
    if (!fUsername.trim() || !fPassword.trim() || !fDisplayName.trim()) {
      setFError("الاسم، اسم المستخدم، وكلمة المرور إلزامية");
      return;
    }
    setFSaving(true); setFError(null);
    try {
      await adminCreateAgent(savedKey, {
        username: fUsername.trim(),
        password: fPassword.trim(),
        display_name: fDisplayName.trim(),
        allowed_skus: fSkus.length > 0 ? fSkus : null,
      });
      setModal(null);
      load(savedKey);
    } catch (e) {
      setFError(e instanceof ApiError ? e.message : "فشل الحفظ");
    } finally {
      setFSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (modal?.type !== "edit") return;
    setFSaving(true); setFError(null);
    try {
      await adminUpdateAgent(savedKey, modal.agent.id, {
        display_name: fDisplayName.trim() || undefined,
        password: fPassword.trim() || undefined,
        status: fStatus,
        allowed_skus: fSkus.length > 0 ? fSkus : null,
        clear_skus: fSkus.length === 0,
      });
      setModal(null);
      load(savedKey);
    } catch (e) {
      setFError(e instanceof ApiError ? e.message : "فشل الحفظ");
    } finally {
      setFSaving(false);
    }
  };

  const handleDelete = async () => {
    if (modal?.type !== "delete") return;
    setFSaving(true); setFError(null);
    try {
      await adminDeleteAgent(savedKey, modal.agent.id);
      setModal(null);
      load(savedKey);
    } catch (e) {
      setFError(e instanceof ApiError ? e.message : "فشل الحذف");
    } finally {
      setFSaving(false);
    }
  };

  const getStats = (agentId: string): AgentStats | undefined =>
    stats.find((s) => s.agent_id === agentId);

  const toggleSku = (sku: string) =>
    setFSkus((prev) => prev.includes(sku) ? prev.filter((s) => s !== sku) : [...prev, sku]);

  if (!savedKey) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <form onSubmit={handleKeySubmit} className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-sm space-y-4">
          <h1 className="text-white text-xl font-bold text-center">مفتاح الإدارة</h1>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="ADMIN_API_KEY"
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 font-semibold transition">
            دخول
          </button>
        </form>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 px-4 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-5 h-5 rotate-180" />
        </Link>
        <h1 className="text-lg font-bold flex-1">إدارة الموظفات</h1>
        <button
          onClick={() => setShowStats(!showStats)}
          className="text-slate-400 hover:text-white transition p-2"
          title="إظهار/إخفاء الإحصائيات"
        >
          <BarChart3 className="w-5 h-5" />
        </button>
        <button
          onClick={() => load(savedKey)}
          className="text-slate-400 hover:text-white transition p-2"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" />
          موظفة جديدة
        </button>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {error && (
          <div className="bg-rose-900/30 border border-rose-700 rounded-xl p-4 text-rose-300 text-sm">{error}</div>
        )}

        {loading && agents.length === 0 && (
          <div className="text-center text-slate-400 py-12">جاري التحميل...</div>
        )}

        {/* Stats overview */}
        {showStats && stats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.agent_id} className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-1">
                <p className="text-xs text-slate-400 truncate">{s.display_name}</p>
                <p className="text-2xl font-bold text-emerald-400">{s.confirmation_rate.toFixed(0)}%</p>
                <p className="text-xs text-slate-500">{s.total_assigned} طلب · {s.pending_open} مفتوح</p>
                {s.avg_response_minutes != null && (
                  <p className="text-xs text-slate-500">⏱ {s.avg_response_minutes} د</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Agents table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {agents.length === 0 && !loading ? (
            <div className="text-center text-slate-400 py-12">
              لا توجد موظفات بعد. أضف أول موظفة.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="text-right text-slate-400 font-medium px-4 py-3">الموظفة</th>
                  <th className="text-right text-slate-400 font-medium px-4 py-3 hidden sm:table-cell">اسم المستخدم</th>
                  <th className="text-center text-slate-400 font-medium px-4 py-3">الحالة</th>
                  <th className="text-right text-slate-400 font-medium px-4 py-3 hidden md:table-cell">المنتجات</th>
                  <th className="text-center text-slate-400 font-medium px-4 py-3 hidden sm:table-cell">التأكيد</th>
                  <th className="text-center text-slate-400 font-medium px-4 py-3 hidden sm:table-cell">الطلبات</th>
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
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell text-slate-400 font-mono text-xs">
                        {agent.username}
                      </td>
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
                      <td className="px-4 py-4 hidden md:table-cell">
                        {agent.allowed_skus && agent.allowed_skus.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {agent.allowed_skus.map((sku) => (
                              <span key={sku} className="text-xs bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/40">
                                {SUPPORTED_SKUS.find((s) => s.value === sku)?.label || sku}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">كل المنتجات</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center hidden sm:table-cell">
                        {s ? (
                          <span className={`font-bold ${s.confirmation_rate >= 60 ? "text-emerald-400" : s.confirmation_rate >= 40 ? "text-amber-400" : "text-rose-400"}`}>
                            {s.confirmation_rate.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center hidden sm:table-cell">
                        {s ? (
                          <span className="text-slate-300">{s.total_assigned}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEdit(agent)}
                            className="text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-slate-700"
                            title="تعديل"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setFError(null); setModal({ type: "delete", agent }); }}
                            className="text-slate-400 hover:text-rose-400 transition p-1.5 rounded-lg hover:bg-rose-900/20"
                            title="حذف"
                          >
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

      {/* Modals */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Create / Edit Modal */}
            {(modal.type === "create" || modal.type === "edit") && (
              <>
                <h2 className="text-lg font-bold text-white">
                  {modal.type === "create" ? "إضافة موظفة جديدة" : `تعديل: ${modal.agent.display_name}`}
                </h2>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">الاسم الكامل</label>
                    <input
                      value={fDisplayName}
                      onChange={(e) => setFDisplayName(e.target.value)}
                      placeholder="مثال: فاطمة الزهراء"
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {modal.type === "create" && (
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">اسم المستخدم</label>
                      <input
                        value={fUsername}
                        onChange={(e) => setFUsername(e.target.value)}
                        placeholder="مثال: fatima"
                        className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                        dir="ltr"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      كلمة المرور {modal.type === "edit" && <span className="text-slate-500">(اتركها فارغة إن لم تريد تغييرها)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        value={fPassword}
                        onChange={(e) => setFPassword(e.target.value)}
                        placeholder="6 أحرف على الأقل"
                        className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {modal.type === "edit" && (
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">الحالة</label>
                      <div className="flex gap-2">
                        {(["active", "inactive"] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => setFStatus(s)}
                            className={`flex-1 py-2 rounded-xl text-sm font-medium transition border ${
                              fStatus === s
                                ? s === "active"
                                  ? "bg-emerald-700 border-emerald-600 text-white"
                                  : "bg-slate-700 border-slate-600 text-white"
                                : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                            }`}
                          >
                            {s === "active" ? "نشطة" : "موقوفة"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      المنتجات المسموح بها <span className="text-slate-500">(فارغ = كل المنتجات)</span>
                    </label>
                    <div className="space-y-2">
                      {SUPPORTED_SKUS.map((sku) => (
                        <button
                          key={sku.value}
                          onClick={() => toggleSku(sku.value)}
                          className={`w-full text-right px-4 py-3 rounded-xl text-sm border transition ${
                            fSkus.includes(sku.value)
                              ? "bg-indigo-900/40 border-indigo-600 text-indigo-200"
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                          }`}
                        >
                          {sku.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {fError && <p className="text-rose-400 text-sm bg-rose-900/20 p-3 rounded-xl">{fError}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setModal(null)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 font-medium transition"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={modal.type === "create" ? handleSaveCreate : handleSaveEdit}
                    disabled={fSaving}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-xl py-3 font-semibold transition"
                  >
                    {fSaving ? "جاري الحفظ..." : "حفظ"}
                  </button>
                </div>
              </>
            )}

            {/* Delete Modal */}
            {modal.type === "delete" && (
              <>
                <h2 className="text-lg font-bold text-white">حذف موظفة</h2>
                <p className="text-slate-300">
                  هل أنت متأكد من حذف <span className="text-white font-semibold">{modal.agent.display_name}</span>؟
                  سيتم إلغاء تعيين طلباتها.
                </p>
                {fError && <p className="text-rose-400 text-sm">{fError}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => setModal(null)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 font-medium transition"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={fSaving}
                    className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white rounded-xl py-3 font-semibold transition"
                  >
                    {fSaving ? "جاري الحذف..." : "حذف"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
