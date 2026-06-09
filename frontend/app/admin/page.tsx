"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AdminAnalytics,
  AdminOrder,
  AdminOrdersResponse,
  ApiError,
  getAdminAnalytics,
  getAdminOrders,
  updateAdminOrderStatus,
} from "@/lib/api";
import { formatMad } from "@/lib/currency";

const ADMIN_KEY_STORAGE = "tawazon_admin_key";
const ORDER_STATUSES = [
  { value: "new", label: "جديد" },
  { value: "confirmed", label: "مؤكد" },
  { value: "no_answer", label: "لا يجيب" },
  { value: "cancelled", label: "ملغي" },
  { value: "shipped", label: "تم الإرسال" },
  { value: "delivered", label: "تم التسليم" },
  { value: "returned", label: "مرتجع" },
] as const;

const statusLabels = Object.fromEntries(ORDER_STATUSES.map((item) => [item.value, item.label]));

export default function AdminDashboardPage() {
  const [adminKey, setAdminKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [ordersData, setOrdersData] = useState<AdminOrdersResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [sheetFilter, setSheetFilter] = useState("");
  const [query, setQuery] = useState("");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentKey = savedKey || adminKey;

  useEffect(() => {
    const stored = window.localStorage.getItem(ADMIN_KEY_STORAGE) ?? "";
    if (stored) {
      setAdminKey(stored);
      setSavedKey(stored);
    }
  }, []);

  useEffect(() => {
    if (!savedKey) return;
    void loadDashboard(savedKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey, days]);

  const orders = ordersData?.orders ?? [];
  const maxDailyRevenue = useMemo(
    () => Math.max(1, ...(analytics?.daily_revenue.map((item) => item.total_mad) ?? [1])),
    [analytics]
  );

  async function loadDashboard(key = currentKey) {
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      const [analyticsResult, ordersResult] = await Promise.all([
        getAdminAnalytics(key, days),
        getAdminOrders(key, { limit: 80, status: statusFilter, sheet_sync_status: sheetFilter, q: query }),
      ]);
      setAnalytics(analyticsResult);
      setOrdersData(ordersResult);
    } catch (err) {
      setError(errorMessage(err));
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

  function handleLogout() {
    window.localStorage.removeItem(ADMIN_KEY_STORAGE);
    setSavedKey("");
    setAnalytics(null);
    setOrdersData(null);
    setAdminKey("");
  }

  async function handleStatusChange(order: AdminOrder, nextStatus: string) {
    if (!currentKey || nextStatus === order.status) return;
    setError(null);
    try {
      const updated = await updateAdminOrderStatus(currentKey, order.id, nextStatus);
      setOrdersData((current) =>
        current
          ? { ...current, orders: current.orders.map((item) => (item.id === updated.id ? updated : item)) }
          : current
      );
      void loadDashboard(currentKey);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (!savedKey) {
    return (
      <section className="min-h-screen bg-[#F5F7FB] px-4 py-10 text-[#102033]">
        <div className="mx-auto max-w-md rounded-[32px] border border-white bg-white p-6 text-right shadow-2xl shadow-slate-900/10">
          <p className="text-sm font-black text-[#1E4A8C]">Tawazon Admin</p>
          <h1 className="mt-2 text-3xl font-black">لوحة تحكم المتجر</h1>
          <p className="mt-3 text-sm font-semibold leading-7 text-[#667085]">
            دخل مفتاح الإدارة باش تشوف الطلبات، المداخيل، حالة Google Sheet، والتحليلات التشغيلية.
          </p>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <input
              type="password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              placeholder="ADMIN_API_KEY"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-left font-mono text-sm outline-none transition focus:border-[#1E4A8C]"
              dir="ltr"
            />
            <button className="w-full rounded-full bg-[#1E4A8C] px-5 py-3 text-sm font-black text-white transition hover:bg-[#173B70]">
              دخول للوحة التحكم
            </button>
          </form>
          <p className="mt-4 rounded-2xl bg-[#FFF7ED] px-4 py-3 text-xs font-bold leading-6 text-[#9A3412]">
            خاصك تضيف نفس المفتاح فـ backend env باسم ADMIN_API_KEY.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#F5F7FB] text-[#102033]">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-black text-[#1E4A8C]">Tawazon Health Admin</p>
            <h1 className="text-3xl font-black">Dashboard ديال المتجر</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold"
            >
              <option value={7}>آخر 7 أيام</option>
              <option value={30}>آخر 30 يوم</option>
              <option value={90}>آخر 90 يوم</option>
              <option value={365}>آخر سنة</option>
            </select>
            <button onClick={() => void loadDashboard()} className="rounded-full bg-[#1E4A8C] px-5 py-2 text-sm font-black text-white">
              {loading ? "كيتم التحديث..." : "تحديث البيانات"}
            </button>
            <button onClick={handleLogout} className="rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-black text-[#667085]">
              خروج
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error ? <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="إجمالي المبيعات" value={formatMad(analytics?.total_revenue_mad ?? 0)} note={`${analytics?.total_orders ?? 0} طلب`} />
          <KpiCard label="متوسط الطلب" value={formatMad(analytics?.average_order_value_mad ?? 0)} note="AOV" />
          <KpiCard label="طلبات اليوم" value={String(analytics?.today_orders ?? 0)} note={formatMad(analytics?.today_revenue_mad ?? 0)} />
          <KpiCard
            label="مشاكل Google Sheet"
            value={String(analytics?.failed_sheet_sync ?? 0)}
            note={`${analytics?.pending_sheet_sync ?? 0} pending`}
            tone={analytics?.failed_sheet_sync ? "red" : "green"}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-[#1E4A8C]">Revenue Trend</p>
                <h2 className="text-2xl font-black">المداخيل حسب الأيام</h2>
              </div>
              <span className="rounded-full bg-[#EEF5FF] px-4 py-2 text-xs font-black text-[#1E4A8C]">{analytics?.days ?? days} يوم</span>
            </div>
            <div className="mt-6 flex h-60 items-end gap-2 overflow-x-auto rounded-3xl bg-[#F8FAFC] p-4">
              {(analytics?.daily_revenue ?? []).map((item) => (
                <div key={item.date} className="flex min-w-12 flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-2xl bg-gradient-to-t from-[#1E4A8C] to-[#60A5FA]"
                    style={{ height: `${Math.max(8, (item.total_mad / maxDailyRevenue) * 180)}px` }}
                    title={`${item.date}: ${formatMad(item.total_mad)}`}
                  />
                  <span className="text-[10px] font-bold text-[#667085]">{item.date.slice(5)}</span>
                </div>
              ))}
              {!analytics?.daily_revenue.length ? <EmptyState text="مازال ماكايناش بيانات كافية للرسم." /> : null}
            </div>
          </div>

          <div className="grid gap-6">
            <Panel title="Status Breakdown" subtitle="فين واقفين الطلبات">
              <div className="space-y-3">
                {(analytics?.status_breakdown ?? []).map((item) => (
                  <MetricRow key={item.status} label={statusLabels[item.status] ?? item.status} value={`${item.count} طلب`} sub={formatMad(item.total_mad)} />
                ))}
                {!analytics?.status_breakdown.length ? <EmptyState text="مازال ماكاين حتى status." /> : null}
              </div>
            </Panel>
            <Panel title="Top Cities" subtitle="المدن الأكثر طلباً">
              <div className="space-y-3">
                {(analytics?.top_cities ?? []).map((item) => (
                  <MetricRow key={item.city} label={item.city} value={`${item.orders} طلب`} sub={formatMad(item.total_mad)} />
                ))}
                {!analytics?.top_cities.length ? <EmptyState text="مازال ماكايناش مدن." /> : null}
              </div>
            </Panel>
          </div>
        </div>

        <Panel title="Orders Control Center" subtitle="بحث، فلترة، وتتبع حالة الطلبات">
          <div className="mb-5 grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="بحث بالاسم، الهاتف، المدينة، أو رقم الطلب"
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#1E4A8C]"
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold">
              <option value="">كل الحالات</option>
              {ORDER_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select value={sheetFilter} onChange={(event) => setSheetFilter(event.target.value)} className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold">
              <option value="">كل Google Sheet</option>
              <option value="pending">pending</option>
              <option value="synced">synced</option>
              <option value="failed">failed</option>
              <option value="skipped">skipped</option>
            </select>
            <button onClick={() => void loadDashboard()} className="rounded-2xl bg-[#102033] px-5 py-3 text-sm font-black text-white">
              تطبيق
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-y-2 text-right text-sm">
              <thead>
                <tr className="text-xs font-black text-[#667085]">
                  <th className="px-3 py-2">الطلب</th>
                  <th className="px-3 py-2">العميل</th>
                  <th className="px-3 py-2">الهاتف</th>
                  <th className="px-3 py-2">المدينة</th>
                  <th className="px-3 py-2">العرض</th>
                  <th className="px-3 py-2">المبلغ</th>
                  <th className="px-3 py-2">Sheet</th>
                  <th className="px-3 py-2">الحالة</th>
                  <th className="px-3 py-2">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <OrderRow key={order.id} order={order} onStatusChange={handleStatusChange} />
                ))}
              </tbody>
            </table>
            {!orders.length ? <EmptyState text="ماكاين حتى طلب مطابق للفلاتر." /> : null}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function KpiCard({ label, value, note, tone = "blue" }: { label: string; value: string; note: string; tone?: "blue" | "green" | "red" }) {
  const toneClass = tone === "red" ? "text-red-600 bg-red-50" : tone === "green" ? "text-green-700 bg-green-50" : "text-[#1E4A8C] bg-[#EEF5FF]";
  return (
    <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-black text-[#667085]">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
      <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black ${toneClass}`}>{note}</span>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-black text-[#1E4A8C]">{title}</p>
      <h2 className="text-2xl font-black">{subtitle}</h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function MetricRow({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#F8FAFC] px-4 py-3">
      <div>
        <p className="font-black">{label}</p>
        <p className="text-xs font-bold text-[#667085]">{sub}</p>
      </div>
      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#1E4A8C]">{value}</span>
    </div>
  );
}

function OrderRow({ order, onStatusChange }: { order: AdminOrder; onStatusChange: (order: AdminOrder, status: string) => void }) {
  return (
    <tr className="rounded-2xl bg-white shadow-sm">
      <td className="rounded-r-2xl px-3 py-4 font-black">{order.public_order_number}</td>
      <td className="px-3 py-4 font-bold">{order.customer_name}</td>
      <td className="px-3 py-4 font-mono text-xs" dir="ltr">{order.phone_e164}</td>
      <td className="px-3 py-4">{order.city || "غير محددة"}</td>
      <td className="px-3 py-4">x{order.hero_qty}</td>
      <td className="px-3 py-4 font-black">{formatMad(order.total_mad)}</td>
      <td className="px-3 py-4">
        <span className={`rounded-full px-3 py-1 text-xs font-black ${sheetClass(order.sheet_sync_status)}`}>{order.sheet_sync_status}</span>
      </td>
      <td className="px-3 py-4">
        <select
          value={order.status}
          onChange={(event) => onStatusChange(order, event.target.value)}
          className="rounded-full border border-gray-200 px-3 py-2 text-xs font-black"
        >
          {ORDER_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </td>
      <td className="rounded-l-2xl px-3 py-4 text-xs font-bold text-[#667085]">{formatDate(order.created_at)}</td>
    </tr>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="flex min-h-24 items-center justify-center rounded-3xl bg-[#F8FAFC] p-6 text-center text-sm font-bold text-[#667085]">{text}</div>;
}

function sheetClass(status: string) {
  if (status === "synced") return "bg-green-50 text-green-700";
  if (status === "failed") return "bg-red-50 text-red-700";
  if (status === "pending") return "bg-amber-50 text-amber-700";
  return "bg-gray-100 text-gray-700";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-MA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function errorMessage(err: unknown) {
  if (err instanceof ApiError) return typeof err.message === "string" ? err.message : "تعذر تحميل بيانات الإدارة.";
  if (err instanceof Error) return err.message;
  return "تعذر تحميل بيانات الإدارة.";
}
