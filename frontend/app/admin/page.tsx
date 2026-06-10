"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Calendar,
  Headphones,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
  Package,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
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

type Lang = "en" | "ar";
type TabId = "overview" | "revenue" | "orders" | "customers" | "cities" | "modules";
type Granularity = "daily" | "weekly" | "monthly";

const ADMIN_KEY_STORAGE = "tawazon_admin_key";
const LANG_STORAGE = "tawazon_admin_lang";

const ORDER_STATUSES = [
  { value: "new", en: "New", ar: "جديد", color: "bg-sky-50 text-sky-700" },
  { value: "awaiting_confirmation", en: "Awaiting Confirmation", ar: "ينتظر التأكيد", color: "bg-amber-50 text-amber-700" },
  { value: "confirmed", en: "Confirmed", ar: "مؤكد", color: "bg-indigo-50 text-indigo-700" },
  { value: "packed", en: "Packed", ar: "مجهز", color: "bg-purple-50 text-purple-700" },
  { value: "no_answer", en: "No Answer", ar: "لا يجيب", color: "bg-orange-50 text-orange-700" },
  { value: "cancelled", en: "Cancelled", ar: "ملغي", color: "bg-rose-50 text-rose-700" },
  { value: "shipped", en: "Shipped", ar: "تم الإرسال", color: "bg-cyan-50 text-cyan-700" },
  { value: "delivered", en: "Delivered", ar: "تم التسليم", color: "bg-emerald-50 text-emerald-700" },
  { value: "returned", en: "Returned", ar: "مرتجع", color: "bg-red-50 text-red-700" },
  { value: "refused", en: "Refused", ar: "مرفوض", color: "bg-red-50 text-red-700" },
] as const;

const STATUS_COLOR = Object.fromEntries(ORDER_STATUSES.map((s) => [s.value, s.color]));

const DATE_FILTERS = [
  { days: 1, en: "Today", ar: "اليوم" },
  { days: 7, en: "7 Days", ar: "7 أيام" },
  { days: 15, en: "15 Days", ar: "15 يوم" },
  { days: 30, en: "30 Days", ar: "30 يوم" },
  { days: 60, en: "60 Days", ar: "60 يوم" },
  { days: 90, en: "90 Days", ar: "90 يوم" },
  { days: 180, en: "180 Days", ar: "180 يوم" },
  { days: 365, en: "365 Days", ar: "365 يوم" },
] as const;

const NAV: { id: TabId; en: string; ar: string; Icon: typeof LayoutDashboard }[] = [
  { id: "overview", en: "Overview", ar: "الرئيسية", Icon: LayoutDashboard },
  { id: "revenue", en: "Revenue", ar: "المداخيل", Icon: TrendingUp },
  { id: "orders", en: "Orders", ar: "الطلبات", Icon: Package },
  { id: "customers", en: "Customers", ar: "العملاء", Icon: Users },
  { id: "cities", en: "Cities", ar: "المدن", Icon: MapPin },
  { id: "modules", en: "Modules", ar: "الوحدات", Icon: Boxes },
];

export default function AdminDashboardPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const [tab, setTab] = useState<TabId>("overview");
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [adminKey, setAdminKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [ordersData, setOrdersData] = useState<AdminOrdersResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [sheetFilter, setSheetFilter] = useState("");
  const [query, setQuery] = useState("");
  const [days, setDays] = useState(30);
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isArabic = lang === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);
  const currentKey = savedKey || adminKey;
  const orders = ordersData?.orders ?? [];

  const periodMap = useMemo(() => {
    const map = new Map<string, { orders: number; revenue_mad: number }>();
    analytics?.period_metrics.forEach((item) => map.set(item.key, item));
    return map;
  }, [analytics]);

  const statusMap = useMemo(() => {
    const map = new Map<string, { count: number; total_mad: number }>();
    analytics?.status_breakdown.forEach((item) => map.set(item.status, item));
    return map;
  }, [analytics]);

  const rateMap = useMemo(() => {
    const map = new Map<string, number>();
    analytics?.delivery_metrics.forEach((item) => map.set(item.key, item.value));
    return map;
  }, [analytics]);

  const chartData = useMemo(
    () => bucketRevenue(analytics?.daily_revenue ?? [], granularity),
    [analytics, granularity]
  );
  const maxChart = useMemo(() => Math.max(1, ...chartData.map((d) => d.value)), [chartData]);

  const customerStats = useMemo(() => {
    const byPhone = new Map<string, { orders: number; revenue: number; name: string; city: string | null | undefined }>();
    orders.forEach((o) => {
      const prev = byPhone.get(o.phone_e164) ?? { orders: 0, revenue: 0, name: o.customer_name, city: o.city };
      prev.orders += 1;
      prev.revenue += o.total_mad;
      byPhone.set(o.phone_e164, prev);
    });
    const unique = byPhone.size;
    const repeat = [...byPhone.values()].filter((c) => c.orders > 1).length;
    const top = [...byPhone.entries()]
      .map(([phone, v]) => ({ phone, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
    return { unique, repeat, repeatRate: unique ? Math.round((repeat / unique) * 100) : 0, top };
  }, [orders]);

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
    window.localStorage.setItem(LANG_STORAGE, lang);
  }, [lang]);

  useEffect(() => {
    if (!savedKey) return;
    void loadDashboard(savedKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey, days]);

  async function loadDashboard(key = currentKey) {
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      const [analyticsResult, ordersResult] = await Promise.all([
        getAdminAnalytics(key, days),
        getAdminOrders(key, { limit: 200, status: statusFilter, sheet_sync_status: sheetFilter, q: query }),
      ]);
      setAnalytics(analyticsResult);
      setOrdersData(ordersResult);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(t("This key is for the call center only. Open the Call Center page.", "هاد المفتاح خاص بالـ call center فقط. دخل لصفحة Call Center."));
        window.localStorage.removeItem(ADMIN_KEY_STORAGE);
        setSavedKey("");
      } else {
        setError(errorMessage(err, lang));
        if (err instanceof ApiError && err.status === 401) {
          window.localStorage.removeItem(ADMIN_KEY_STORAGE);
          setSavedKey("");
        }
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

  function applyCustomDate(value: string) {
    setCustomStart(value);
    if (!value) return;
    const start = new Date(value).getTime();
    if (Number.isNaN(start)) return;
    const diff = Math.ceil((Date.now() - start) / (1000 * 60 * 60 * 24));
    setDays(Math.min(365, Math.max(1, diff)));
  }

  async function handleStatusChange(order: AdminOrder, nextStatus: string) {
    if (!currentKey || nextStatus === order.status) return;
    setError(null);
    try {
      const updated = await updateAdminOrderStatus(currentKey, order.id, nextStatus);
      setOrdersData((current) =>
        current ? { ...current, orders: current.orders.map((item) => (item.id === updated.id ? updated : item)) } : current
      );
      void loadDashboard(currentKey);
    } catch (err) {
      setError(errorMessage(err, lang));
    }
  }

  if (!savedKey) {
    return (
      <section dir={isArabic ? "rtl" : "ltr"} className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0B1724] via-[#102033] to-[#1E4A8C] px-4 py-10 text-[#102033]">
        <div className="w-full max-w-md rounded-[32px] border border-white/20 bg-white p-7 shadow-2xl">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1E4A8C] text-lg font-black text-white">ت</div>
            <LanguageToggle lang={lang} setLang={setLang} />
          </div>
          <h1 className="text-3xl font-black">{t("Store Admin", "لوحة تحكم المتجر")}</h1>
          <p className="mt-3 text-sm font-semibold leading-7 text-[#667085]">
            {t(
              "Enter the admin key to access orders, revenue, analytics, and the CEO dashboard.",
              "دخل مفتاح الإدارة باش تشوف الطلبات، المداخيل، التحليلات، ونسخة CEO كاملة."
            )}
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
              {t("Open Dashboard", "دخول للوحة التحكم")}
            </button>
          </form>
        </div>
      </section>
    );
  }

  const overviewKpis = [
    { label: t("Total Revenue", "إجمالي المداخيل"), value: money(analytics?.total_revenue_mad), note: `${count(analytics?.total_orders)} ${t("orders", "طلب")}`, tone: "blue" as const },
    { label: t("Avg Order Value", "متوسط الطلب"), value: money(analytics?.average_order_value_mad), note: "AOV", tone: "blue" as const },
    { label: t("Today Revenue", "مداخيل اليوم"), value: money(analytics?.today_revenue_mad), note: `${count(analytics?.today_orders)} ${t("orders", "طلب")}`, tone: "blue" as const },
    { label: t("Delivered", "المسلّمة"), value: count(statusMap.get("delivered")?.count), note: percent(rateMap.get("delivery_rate")), tone: "green" as const },
    { label: t("Delivery Rate", "نسبة التسليم"), value: percent(rateMap.get("delivery_rate")), note: t("Delivered / Shipped", "مسلّم / مرسل"), tone: "green" as const },
    { label: t("Confirmation Rate", "نسبة التأكيد"), value: percent(rateMap.get("confirmation_rate")), note: t("Confirmed / Orders", "مؤكد / الطلبات"), tone: "blue" as const },
    { label: t("Return Rate", "نسبة الراجع"), value: percent(rateMap.get("return_rate")), note: t("Returned / Shipped", "راجع / مرسل"), tone: "red" as const },
    { label: t("Sheet Issues", "مشاكل Google Sheet"), value: count(analytics?.failed_sheet_sync), note: `${count(analytics?.pending_sheet_sync)} pending`, tone: (analytics?.failed_sheet_sync ? "red" : "green") as "red" | "green" },
  ];

  return (
    <section dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-[#F5F7FB] text-[#102033]">
      <header className="sticky top-0 z-40 bg-gradient-to-l from-[#0B1724] to-[#1E4A8C] text-white shadow-lg">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-lg font-black">ت</div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-white/70">Tawazon Health</p>
              <h1 className="text-xl font-black">{t("CEO Dashboard", "لوحة تحكم المدير")}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageToggle lang={lang} setLang={setLang} dark />
            <Link
              href="/admin/call-center"
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-[#1E4A8C] transition hover:bg-white/90"
            >
              <Headphones className="h-4 w-4" />
              {t("Call Center", "مركز الاتصال")}
            </Link>
            <button
              onClick={() => void loadDashboard()}
              className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black text-white transition hover:bg-white/25"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? t("Refreshing", "كيتحدث") : t("Refresh", "تحديث")}
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/20">
              <LogOut className="h-4 w-4" />
              {t("Logout", "خروج")}
            </button>
          </div>
        </div>
      </header>

      <nav className="sticky top-[72px] z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1480px] gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
          {NAV.map(({ id, en, ar, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-4 text-sm font-black transition ${
                tab === id ? "border-[#1E4A8C] text-[#1E4A8C]" : "border-transparent text-[#667085] hover:text-[#102033]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(en, ar)}
            </button>
          ))}
        </div>
      </nav>

      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <span className="flex items-center gap-2 text-xs font-black text-[#667085]">
            <Calendar className="h-4 w-4" />
            {t("Period", "الفترة")}:
          </span>
          {DATE_FILTERS.map((item) => (
            <button
              key={item.days}
              onClick={() => {
                setShowCustom(false);
                setDays(item.days);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                days === item.days && !showCustom ? "bg-[#1E4A8C] text-white" : "bg-[#F5F7FB] text-[#667085] hover:bg-[#EEF5FF]"
              }`}
            >
              {t(item.en, item.ar)}
            </button>
          ))}
          <button
            onClick={() => setShowCustom((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
              showCustom ? "bg-[#1E4A8C] text-white" : "bg-[#F5F7FB] text-[#667085] hover:bg-[#EEF5FF]"
            }`}
          >
            {t("Custom Date", "تاريخ مخصص")}
          </button>
          {showCustom ? (
            <input
              type="date"
              value={customStart}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(event) => applyCustomDate(event.target.value)}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-bold outline-none focus:border-[#1E4A8C]"
            />
          ) : null}
          <span className="ms-auto rounded-full bg-[#EEF5FF] px-3 py-1.5 text-xs font-black text-[#1E4A8C]">
            {t("Window", "النافذة")}: {analytics?.days ?? days} {t("days", "يوم")}
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-[1480px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error ? <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}

        {tab === "overview" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {overviewKpis.map((kpi) => (
                <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} note={kpi.note} tone={kpi.tone} />
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
              <Card title={t("Revenue Trend", "تطور المداخيل")} subtitle={t("Performance over the selected window", "الأداء خلال الفترة المختارة")}>
                <GranularityToggle value={granularity} setValue={setGranularity} lang={lang} />
                <BarChart data={chartData} max={maxChart} emptyText={t("Not enough data yet.", "مازال ماكايناش بيانات كافية.")} />
              </Card>

              <Card title={t("Order Funnel", "مسار الطلبات")} subtitle={t("From order to paid", "من الطلب حتى الدفع")}>
                <div className="space-y-2">
                  {(analytics?.order_funnel ?? []).map((step, index) => (
                    <div key={step.key}>
                      <FunnelStep label={translateFunnel(step.label, lang)} count={step.count} rate={step.rate} />
                      {index < (analytics?.order_funnel.length ?? 0) - 1 ? (
                        <div className="py-1 text-center text-xs text-[#9AA7B8]">↓</div>
                      ) : null}
                    </div>
                  ))}
                  {!analytics?.order_funnel.length ? <EmptyState text={t("No funnel data yet.", "مازال ماكايناش بيانات.")} /> : null}
                </div>
              </Card>
            </div>

            <Card title={t("Status Breakdown", "توزيع الحالات")} subtitle={t("Live order statuses in the period", "حالات الطلبات الحية فالفترة")}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {ORDER_STATUSES.map((s) => (
                  <StatusTile key={s.value} label={t(s.en, s.ar)} count={statusMap.get(s.value)?.count ?? 0} revenue={statusMap.get(s.value)?.total_mad ?? 0} color={s.color} />
                ))}
              </div>
            </Card>
          </>
        ) : null}

        {tab === "revenue" ? (
          <>
            <Card title={t("Revenue Trend", "تطور المداخيل")} subtitle={t("Daily, weekly, and monthly views", "عرض يومي، أسبوعي، وشهري")}>
              <GranularityToggle value={granularity} setValue={setGranularity} lang={lang} />
              <BarChart data={chartData} max={maxChart} emptyText={t("Not enough data yet.", "مازال ماكايناش بيانات كافية.")} />
            </Card>

            <Card title={t("Revenue by Period", "المداخيل حسب الفترة")} subtitle={t("Compare key time windows", "قارن أهم الفترات")}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  { key: "today", en: "Today", ar: "اليوم" },
                  { key: "yesterday", en: "Yesterday", ar: "البارح" },
                  { key: "last_7_days", en: "Last 7 Days", ar: "آخر 7 أيام" },
                  { key: "last_30_days", en: "Last 30 Days", ar: "آخر 30 يوم" },
                  { key: "this_month", en: "This Month", ar: "هذا الشهر" },
                  { key: "last_month", en: "Last Month", ar: "الشهر الماضي" },
                  { key: "this_year", en: "This Year", ar: "هذه السنة" },
                  { key: "last_year", en: "Last Year", ar: "السنة الماضية" },
                ].map((p) => (
                  <KpiCard
                    key={p.key}
                    label={t(p.en, p.ar)}
                    value={money(periodMap.get(p.key)?.revenue_mad)}
                    note={`${count(periodMap.get(p.key)?.orders)} ${t("orders", "طلب")}`}
                  />
                ))}
              </div>
            </Card>

            <Card title={t("Comparisons", "المقارنات")} subtitle={t("Period over period", "فترة مقابل فترة")}>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <CompareCard label={t("Today vs Yesterday", "اليوم vs البارح")} left={money(periodMap.get("today")?.revenue_mad)} right={money(periodMap.get("yesterday")?.revenue_mad)} />
                <CompareCard label={t("7d vs 30d", "7 أيام vs 30 يوم")} left={money(periodMap.get("last_7_days")?.revenue_mad)} right={money(periodMap.get("last_30_days")?.revenue_mad)} />
                <CompareCard label={t("This vs Last Month", "هذا vs الشهر الماضي")} left={money(periodMap.get("this_month")?.revenue_mad)} right={money(periodMap.get("last_month")?.revenue_mad)} />
                <CompareCard label={t("This vs Last Year", "هذه vs السنة الماضية")} left={money(periodMap.get("this_year")?.revenue_mad)} right={money(periodMap.get("last_year")?.revenue_mad)} />
              </div>
            </Card>
          </>
        ) : null}

        {tab === "orders" ? (
          <Card title={t("Orders Control Center", "مركز التحكم في الطلبات")} subtitle={t("Search, filter, and update order status", "بحث، فلترة، وتغيير حالة الطلبات")}>
            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
              <div className="relative">
                <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA7B8] ltr:left-4 rtl:right-4" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void loadDashboard();
                  }}
                  placeholder={t("Search name, phone, city, order #", "بحث بالاسم، الهاتف، المدينة، رقم الطلب")}
                  className="w-full rounded-2xl border border-gray-200 py-3 text-sm font-bold outline-none focus:border-[#1E4A8C] ltr:pl-11 ltr:pr-4 rtl:pr-11 rtl:pl-4"
                />
              </div>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold">
                <option value="">{t("All statuses", "كل الحالات")}</option>
                {ORDER_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {t(item.en, item.ar)}
                  </option>
                ))}
              </select>
              <select value={sheetFilter} onChange={(event) => setSheetFilter(event.target.value)} className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold">
                <option value="">{t("All Sheet Sync", "كل Google Sheet")}</option>
                <option value="pending">pending</option>
                <option value="synced">synced</option>
                <option value="failed">failed</option>
                <option value="skipped">skipped</option>
              </select>
              <button onClick={() => void loadDashboard()} className="rounded-2xl bg-[#102033] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1E4A8C]">
                {t("Apply", "تطبيق")}
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2 text-xs font-black text-[#667085]">
              <span className="rounded-full bg-[#F5F7FB] px-3 py-1.5">{t("Showing", "ظاهر")}: {orders.length}</span>
              <span className="rounded-full bg-[#F5F7FB] px-3 py-1.5">{t("Total", "الإجمالي")}: {ordersData?.total ?? 0}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-xs font-black text-[#667085]">
                    <th className="px-3 py-2 text-start">{t("Order", "الطلب")}</th>
                    <th className="px-3 py-2 text-start">{t("Customer", "العميل")}</th>
                    <th className="px-3 py-2 text-start">{t("Phone", "الهاتف")}</th>
                    <th className="px-3 py-2 text-start">{t("City", "المدينة")}</th>
                    <th className="px-3 py-2 text-start">{t("Qty", "الكمية")}</th>
                    <th className="px-3 py-2 text-start">{t("Revenue", "المبلغ")}</th>
                    <th className="px-3 py-2 text-start">Sheet</th>
                    <th className="px-3 py-2 text-start">{t("Status", "الحالة")}</th>
                    <th className="px-3 py-2 text-start">{t("Date", "التاريخ")}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <OrderRow key={order.id} lang={lang} order={order} onStatusChange={handleStatusChange} />
                  ))}
                </tbody>
              </table>
              {!orders.length ? <EmptyState text={t("No orders match these filters.", "ماكاين حتى طلب مطابق للفلاتر.")} /> : null}
            </div>
          </Card>
        ) : null}

        {tab === "customers" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label={t("Unique Customers", "عملاء فريدون")} value={count(customerStats.unique)} note={t("In current orders", "فالطلبات الحالية")} />
              <KpiCard label={t("Returning", "عملاء راجعون")} value={count(customerStats.repeat)} note={percent(customerStats.repeatRate)} tone="green" />
              <KpiCard label={t("Repeat Rate", "نسبة التكرار")} value={percent(customerStats.repeatRate)} note={t("Repeat / Unique", "راجع / فريد")} />
              <KpiCard label={t("Avg Order Value", "متوسط الطلب")} value={money(analytics?.average_order_value_mad)} note="AOV" />
            </div>
            <Card title={t("Top Customers", "أفضل العملاء")} subtitle={t("By revenue in current orders", "حسب المداخيل فالطلبات الحالية")}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-xs font-black text-[#667085]">
                      <th className="px-3 py-2 text-start">{t("Customer", "العميل")}</th>
                      <th className="px-3 py-2 text-start">{t("Phone", "الهاتف")}</th>
                      <th className="px-3 py-2 text-start">{t("City", "المدينة")}</th>
                      <th className="px-3 py-2 text-start">{t("Orders", "الطلبات")}</th>
                      <th className="px-3 py-2 text-start">{t("Revenue", "المداخيل")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerStats.top.map((c) => (
                      <tr key={c.phone} className="bg-white shadow-sm">
                        <td className="px-3 py-3 font-black">{c.name}</td>
                        <td className="px-3 py-3 font-mono text-xs" dir="ltr">{c.phone}</td>
                        <td className="px-3 py-3">{c.city || t("Unknown", "غير محددة")}</td>
                        <td className="px-3 py-3 font-black">{c.orders}</td>
                        <td className="px-3 py-3 font-black text-[#1E4A8C]">{formatMad(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!customerStats.top.length ? <EmptyState text={t("No customers yet.", "مازال ماكايناش عملاء.")} /> : null}
              </div>
            </Card>
          </>
        ) : null}

        {tab === "cities" ? (
          <Card title={t("Top Cities", "أفضل المدن")} subtitle={t("Revenue and orders by city", "المداخيل والطلبات حسب المدينة")}>
            <div className="space-y-3">
              {(analytics?.top_cities ?? []).map((cityRow) => {
                const maxCity = Math.max(1, ...(analytics?.top_cities.map((c) => c.total_mad) ?? [1]));
                return (
                  <div key={cityRow.city} className="rounded-2xl bg-[#F8FAFC] p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="font-black">{cityRow.city}</span>
                      <span className="text-sm font-black text-[#1E4A8C]">{formatMad(cityRow.total_mad)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div className="h-full rounded-full bg-gradient-to-l from-[#1E4A8C] to-[#60A5FA]" style={{ width: `${Math.max(4, (cityRow.total_mad / maxCity) * 100)}%` }} />
                    </div>
                    <p className="mt-2 text-xs font-bold text-[#667085]">{cityRow.orders} {t("orders", "طلب")}</p>
                  </div>
                );
              })}
              {!analytics?.top_cities.length ? <EmptyState text={t("No city data yet.", "مازال ماكايناش بيانات المدن.")} /> : null}
            </div>
          </Card>
        ) : null}

        {tab === "modules" ? <ModulesGrid lang={lang} analytics={analytics} statusMap={statusMap} /> : null}
      </main>
    </section>
  );
}

function ModulesGrid({
  lang,
  analytics,
  statusMap,
}: {
  lang: Lang;
  analytics: AdminAnalytics | null;
  statusMap: Map<string, { count: number; total_mad: number }>;
}) {
  const t = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const delivered = statusMap.get("delivered")?.count ?? 0;
  const returned = statusMap.get("returned")?.count ?? 0;

  const modules = [
    {
      Icon: Megaphone,
      title: t("Ads Dashboard", "لوحة الإعلانات"),
      desc: t("Meta, TikTok & Google spend, ROAS, CPA, CPM, CPC, CTR.", "إنفاق Meta و TikTok و Google، ROAS، CPA، CPM، CPC، CTR."),
      connected: false,
      metrics: [
        { label: t("Revenue", "المداخيل"), value: money(analytics?.total_revenue_mad) },
        { label: "Spend", value: "—" },
        { label: "ROAS", value: "—" },
      ],
    },
    {
      Icon: Package,
      title: t("Products Dashboard", "لوحة المنتجات"),
      desc: t("Best sellers, revenue, delivered, return rate, profit.", "الأكثر مبيعاً، المداخيل، المسلّم، نسبة الراجع، الربح."),
      connected: true,
      metrics: [
        { label: t("Top Product", "أفضل منتج"), value: "Blood Sugar Complex" },
        { label: t("Orders", "الطلبات"), value: count(analytics?.total_orders) },
        { label: t("Delivered", "المسلّم"), value: count(delivered) },
      ],
    },
    {
      Icon: Users,
      title: t("Customers Dashboard", "لوحة العملاء"),
      desc: t("New & returning customers, LTV, AOV, repeat rate.", "عملاء جدد وراجعون، LTV، AOV، نسبة التكرار."),
      connected: true,
      metrics: [
        { label: "AOV", value: money(analytics?.average_order_value_mad) },
        { label: t("Total Orders", "إجمالي الطلبات"), value: count(analytics?.total_orders) },
        { label: "LTV", value: "—" },
      ],
    },
    {
      Icon: TrendingUp,
      title: t("Shipping Dashboard", "لوحة الشحن"),
      desc: t("Amana, Ozon, Express Relais delivery rate & cost.", "أمانة، أوزون، Express Relais نسبة التسليم والتكلفة."),
      connected: false,
      metrics: [
        { label: t("Delivered", "المسلّم"), value: count(delivered) },
        { label: t("Returned", "الراجع"), value: count(returned) },
        { label: t("Shipping Cost", "تكلفة الشحن"), value: "—" },
      ],
    },
    {
      Icon: Users,
      title: t("Call Center", "مركز الاتصال"),
      desc: t("Agents, calls, confirmation rate, revenue generated.", "العملاء، المكالمات، نسبة التأكيد، المداخيل المحققة."),
      connected: false,
      metrics: [
        { label: t("Confirmed", "مؤكد"), value: count(statusMap.get("confirmed")?.count) },
        { label: t("No Answer", "لا يجيب"), value: count(statusMap.get("no_answer")?.count) },
        { label: t("Agents", "العملاء"), value: "—" },
      ],
    },
    {
      Icon: Boxes,
      title: t("Stock Dashboard", "لوحة المخزون"),
      desc: t("Inventory, low stock, reserved, available, sold.", "المخزون، منخفض، محجوز، متاح، مباع."),
      connected: false,
      metrics: [
        { label: t("Sold", "مباع"), value: count(delivered) },
        { label: t("Low Stock", "مخزون منخفض"), value: "—" },
        { label: t("Out Of Stock", "نفد"), value: "—" },
      ],
    },
    {
      Icon: TrendingUp,
      title: t("Finance Dashboard", "لوحة المالية"),
      desc: t("Cash flow, expenses, profit, salaries, software.", "التدفق النقدي، المصاريف، الربح، الأجور، البرامج."),
      connected: false,
      metrics: [
        { label: t("Revenue", "المداخيل"), value: money(analytics?.total_revenue_mad) },
        { label: t("Expenses", "المصاريف"), value: "—" },
        { label: t("Net Profit", "صافي الربح"), value: "—" },
      ],
    },
    {
      Icon: Boxes,
      title: t("AI Center", "مركز الذكاء الاصطناعي"),
      desc: t("Sales & revenue forecast, return & fraud prediction.", "توقع المبيعات والمداخيل، توقع الراجع والاحتيال."),
      connected: false,
      metrics: [
        { label: t("Forecast", "التوقع"), value: "—" },
        { label: t("Fraud", "الاحتيال"), value: "—" },
        { label: t("Insights", "تحليلات"), value: "—" },
      ],
    },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {modules.map((m) => (
        <div key={m.title} className="rounded-[26px] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF5FF] text-[#1E4A8C]">
              <m.Icon className="h-5 w-5" />
            </div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-black ${m.connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {m.connected ? t("Live", "مفعّل") : t("Integration ready", "جاهز للربط")}
            </span>
          </div>
          <h3 className="mt-4 text-lg font-black">{m.title}</h3>
          <p className="mt-1 text-xs font-semibold leading-6 text-[#667085]">{m.desc}</p>
          <div className="mt-4 space-y-2">
            {m.metrics.map((metric) => (
              <div key={metric.label} className="flex items-center justify-between rounded-xl bg-[#F8FAFC] px-3 py-2">
                <span className="text-xs font-bold text-[#667085]">{metric.label}</span>
                <span className="text-sm font-black text-[#102033]">{metric.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GranularityToggle({ value, setValue, lang }: { value: Granularity; setValue: (v: Granularity) => void; lang: Lang }) {
  const options: { id: Granularity; en: string; ar: string }[] = [
    { id: "daily", en: "Daily", ar: "يومي" },
    { id: "weekly", en: "Weekly", ar: "أسبوعي" },
    { id: "monthly", en: "Monthly", ar: "شهري" },
  ];
  return (
    <div className="mb-4 flex gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => setValue(o.id)}
          className={`rounded-full px-4 py-1.5 text-xs font-black transition ${
            value === o.id ? "bg-[#1E4A8C] text-white" : "bg-[#F5F7FB] text-[#667085] hover:bg-[#EEF5FF]"
          }`}
        >
          {lang === "ar" ? o.ar : o.en}
        </button>
      ))}
    </div>
  );
}

function BarChart({ data, max, emptyText }: { data: { label: string; value: number }[]; max: number; emptyText: string }) {
  return (
    <div className="flex h-64 items-end gap-2 overflow-x-auto rounded-3xl bg-[#F8FAFC] p-4">
      {data.map((item) => (
        <div key={item.label} className="group flex min-w-10 flex-1 flex-col items-center gap-2">
          <div className="relative w-full">
            <div
              className="w-full rounded-t-xl bg-gradient-to-t from-[#1E4A8C] to-[#60A5FA] transition group-hover:from-[#173B70]"
              style={{ height: `${Math.max(6, (item.value / max) * 190)}px` }}
              title={`${item.label}: ${formatMad(item.value)}`}
            />
          </div>
          <span className="whitespace-nowrap text-[10px] font-bold text-[#667085]">{item.label}</span>
        </div>
      ))}
      {!data.length ? <EmptyState text={emptyText} /> : null}
    </div>
  );
}

function FunnelStep({ label, count: stepCount, rate }: { label: string; count: number; rate: number }) {
  return (
    <div className="rounded-2xl bg-[#F8FAFC] p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-black">{label}</span>
        <span className="text-sm font-black text-[#1E4A8C]">{stepCount}</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div className="h-full rounded-full bg-gradient-to-l from-[#1E4A8C] to-[#60A5FA]" style={{ width: `${Math.max(3, rate)}%` }} />
      </div>
      <p className="mt-1 text-xs font-bold text-[#667085]">{rate}%</p>
    </div>
  );
}

function StatusTile({ label, count: total, revenue, color }: { label: string; count: number; revenue: number; color: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${color}`}>{label}</span>
      <p className="mt-3 text-2xl font-black">{total}</p>
      <p className="mt-1 text-xs font-bold text-[#667085]">{formatMad(revenue)}</p>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[26px] border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-black">{title}</h2>
        <p className="mt-1 text-sm font-bold text-[#667085]">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function KpiCard({ label, value, note, tone = "blue" }: { label: string; value: string; note: string; tone?: "blue" | "green" | "red" }) {
  const toneClass = tone === "red" ? "text-red-600 bg-red-50" : tone === "green" ? "text-green-700 bg-green-50" : "text-[#1E4A8C] bg-[#EEF5FF]";
  return (
    <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <p className="text-sm font-black text-[#667085]">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
      <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black ${toneClass}`}>{note}</span>
    </div>
  );
}

function CompareCard({ label, left, right }: { label: string; left: string; right: string }) {
  return (
    <div className="rounded-2xl bg-[#F8FAFC] p-4">
      <p className="text-sm font-black text-[#667085]">{label}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-lg font-black text-[#1E4A8C]">{left}</span>
        <span className="text-xs font-bold text-[#9AA7B8]">vs</span>
        <span className="text-lg font-black">{right}</span>
      </div>
    </div>
  );
}

function LanguageToggle({ lang, setLang, dark = false }: { lang: Lang; setLang: (lang: Lang) => void; dark?: boolean }) {
  return (
    <div className={`flex rounded-full p-1 ${dark ? "bg-white/15" : "bg-[#EEF5FF]"}`}>
      {(["ar", "en"] as const).map((item) => (
        <button
          key={item}
          onClick={() => setLang(item)}
          className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
            lang === item ? "bg-white text-[#1E4A8C]" : dark ? "text-white" : "text-[#1E4A8C]"
          }`}
        >
          {item === "ar" ? "العربية" : "EN"}
        </button>
      ))}
    </div>
  );
}

function OrderRow({ lang, order, onStatusChange }: { lang: Lang; order: AdminOrder; onStatusChange: (order: AdminOrder, status: string) => void }) {
  const isArabic = lang === "ar";
  return (
    <tr className="bg-white shadow-sm">
      <td className="px-3 py-4 font-black">{order.public_order_number}</td>
      <td className="px-3 py-4 font-bold">{order.customer_name}</td>
      <td className="px-3 py-4 font-mono text-xs" dir="ltr">{order.phone_e164}</td>
      <td className="px-3 py-4">{order.city || (isArabic ? "غير محددة" : "Unknown")}</td>
      <td className="px-3 py-4">x{order.hero_qty}</td>
      <td className="px-3 py-4 font-black">{formatMad(order.total_mad)}</td>
      <td className="px-3 py-4">
        <span className={`rounded-full px-3 py-1 text-xs font-black ${sheetClass(order.sheet_sync_status)}`}>{order.sheet_sync_status}</span>
      </td>
      <td className="px-3 py-4">
        <select
          value={order.status}
          onChange={(event) => onStatusChange(order, event.target.value)}
          className={`rounded-full border-0 px-3 py-2 text-xs font-black outline-none ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-700"}`}
        >
          {ORDER_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {isArabic ? item.ar : item.en}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-4 text-xs font-bold text-[#667085]">{formatDate(order.created_at, lang)}</td>
    </tr>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="flex min-h-24 w-full items-center justify-center rounded-3xl bg-[#F8FAFC] p-6 text-center text-sm font-bold text-[#667085]">{text}</div>;
}

function bucketRevenue(daily: { date: string; total_mad: number }[], granularity: Granularity) {
  if (granularity === "daily") {
    return daily.map((d) => ({ label: d.date.slice(5), value: d.total_mad }));
  }
  const map = new Map<string, number>();
  daily.forEach((d) => {
    const date = new Date(d.date);
    let key: string;
    if (granularity === "monthly") {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    } else {
      const firstJan = new Date(date.getFullYear(), 0, 1);
      const week = Math.ceil(((date.getTime() - firstJan.getTime()) / 86400000 + firstJan.getDay() + 1) / 7);
      key = `${String(date.getFullYear()).slice(2)}-W${week}`;
    }
    map.set(key, (map.get(key) ?? 0) + d.total_mad);
  });
  return [...map.entries()].map(([label, value]) => ({ label, value }));
}

function count(value?: number) {
  return String(value ?? 0);
}

function money(value?: number) {
  return formatMad(value ?? 0);
}

function percent(value?: number) {
  return `${value ?? 0}%`;
}

function translateFunnel(value: string, lang: Lang) {
  const ar: Record<string, string> = { Orders: "طلبات", Confirmed: "مؤكد", Shipped: "مرسل", Delivered: "مسلم", Paid: "مدفوع" };
  return lang === "ar" ? ar[value] ?? value : value;
}

function sheetClass(status: string) {
  if (status === "synced") return "bg-green-50 text-green-700";
  if (status === "failed") return "bg-red-50 text-red-700";
  if (status === "pending") return "bg-amber-50 text-amber-700";
  return "bg-gray-100 text-gray-700";
}

function formatDate(value: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-MA" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function errorMessage(err: unknown, lang: Lang) {
  if (err instanceof ApiError) return typeof err.message === "string" ? err.message : fallbackError(lang);
  if (err instanceof Error) return err.message;
  return fallbackError(lang);
}

function fallbackError(lang: Lang) {
  return lang === "ar" ? "تعذر تحميل بيانات الإدارة." : "Could not load admin data.";
}
