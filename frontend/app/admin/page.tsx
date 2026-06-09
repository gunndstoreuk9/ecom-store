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

type Lang = "en" | "ar";

const ADMIN_KEY_STORAGE = "tawazon_admin_key";
const LANG_STORAGE = "tawazon_admin_lang";

const ORDER_STATUSES = [
  { value: "new", en: "New", ar: "جديد" },
  { value: "awaiting_confirmation", en: "Awaiting Confirmation", ar: "ينتظر التأكيد" },
  { value: "confirmed", en: "Confirmed", ar: "مؤكد" },
  { value: "packed", en: "Packed", ar: "مجهز" },
  { value: "no_answer", en: "No Answer", ar: "لا يجيب" },
  { value: "cancelled", en: "Cancelled", ar: "ملغي" },
  { value: "shipped", en: "Shipped", ar: "تم الإرسال" },
  { value: "delivered", en: "Delivered", ar: "تم التسليم" },
  { value: "returned", en: "Returned", ar: "مرتجع" },
  { value: "refused", en: "Refused", ar: "مرفوض" },
] as const;

const DATE_FILTERS = [
  { days: 1, en: "Today", ar: "اليوم" },
  { days: 2, en: "Last 2 Days", ar: "آخر يومين" },
  { days: 3, en: "Last 3 Days", ar: "آخر 3 أيام" },
  { days: 4, en: "Last 4 Days", ar: "آخر 4 أيام" },
  { days: 7, en: "Last 7 Days", ar: "آخر 7 أيام" },
  { days: 15, en: "Last 15 Days", ar: "آخر 15 يوم" },
  { days: 30, en: "Last 30 Days", ar: "آخر 30 يوم" },
  { days: 60, en: "Last 60 Days", ar: "آخر 60 يوم" },
  { days: 90, en: "Last 90 Days", ar: "آخر 90 يوم" },
  { days: 180, en: "Last 180 Days", ar: "آخر 180 يوم" },
  { days: 365, en: "Last 365 Days", ar: "آخر 365 يوم" },
] as const;

const INTEGRATION_NOTE = {
  en: "Ready for integration",
  ar: "جاهز للربط",
};

export default function AdminDashboardPage() {
  const [lang, setLang] = useState<Lang>("ar");
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

  const isArabic = lang === "ar";
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

  const maxDailyRevenue = useMemo(
    () => Math.max(1, ...(analytics?.daily_revenue.map((item) => item.total_mad) ?? [1])),
    [analytics]
  );

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
        getAdminOrders(key, { limit: 120, status: statusFilter, sheet_sync_status: sheetFilter, q: query }),
      ]);
      setAnalytics(analyticsResult);
      setOrdersData(ordersResult);
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
      setError(errorMessage(err, lang));
    }
  }

  const revenueCards = [
    card("Revenue Today", "مداخيل اليوم", money(periodMap.get("today")?.revenue_mad), ordersNote(periodMap.get("today")?.orders, lang)),
    card("Revenue Yesterday", "مداخيل البارح", money(periodMap.get("yesterday")?.revenue_mad), ordersNote(periodMap.get("yesterday")?.orders, lang)),
    card("Revenue Last 7 Days", "مداخيل آخر 7 أيام", money(periodMap.get("last_7_days")?.revenue_mad), ordersNote(periodMap.get("last_7_days")?.orders, lang)),
    card("Revenue Last 30 Days", "مداخيل آخر 30 يوم", money(periodMap.get("last_30_days")?.revenue_mad), ordersNote(periodMap.get("last_30_days")?.orders, lang)),
    card("Revenue Last 90 Days", "مداخيل آخر 90 يوم", money(periodMap.get("last_90_days")?.revenue_mad), ordersNote(periodMap.get("last_90_days")?.orders, lang)),
    card("Revenue This Month", "مداخيل هذا الشهر", money(periodMap.get("this_month")?.revenue_mad), ordersNote(periodMap.get("this_month")?.orders, lang)),
    card("Revenue Last Month", "مداخيل الشهر الماضي", money(periodMap.get("last_month")?.revenue_mad), ordersNote(periodMap.get("last_month")?.orders, lang)),
    card("Revenue This Year", "مداخيل هذه السنة", money(periodMap.get("this_year")?.revenue_mad), ordersNote(periodMap.get("this_year")?.orders, lang)),
    card("Revenue Last Year", "مداخيل السنة الماضية", money(periodMap.get("last_year")?.revenue_mad), ordersNote(periodMap.get("last_year")?.orders, lang)),
  ];

  const orderCards = [
    card("Orders Today", "طلبات اليوم", count(periodMap.get("today")?.orders), money(periodMap.get("today")?.revenue_mad)),
    card("Orders Yesterday", "طلبات البارح", count(periodMap.get("yesterday")?.orders), money(periodMap.get("yesterday")?.revenue_mad)),
    card("Orders 7D", "طلبات 7 أيام", count(periodMap.get("last_7_days")?.orders), money(periodMap.get("last_7_days")?.revenue_mad)),
    card("Orders 30D", "طلبات 30 يوم", count(periodMap.get("last_30_days")?.orders), money(periodMap.get("last_30_days")?.revenue_mad)),
    card("Orders Pending", "طلبات قيد الانتظار", count(statusMap.get("new")?.count), money(statusMap.get("new")?.total_mad)),
    card("Orders Confirmed", "طلبات مؤكدة", count(statusMap.get("confirmed")?.count), money(statusMap.get("confirmed")?.total_mad)),
    card("Orders Shipped", "طلبات مرسلة", count(statusMap.get("shipped")?.count), money(statusMap.get("shipped")?.total_mad)),
    card("Orders Delivered", "طلبات مسلمة", count(statusMap.get("delivered")?.count), money(statusMap.get("delivered")?.total_mad)),
    card("Orders Returned", "طلبات مرتجعة", count(statusMap.get("returned")?.count), money(statusMap.get("returned")?.total_mad)),
    card("Orders Cancelled", "طلبات ملغية", count(statusMap.get("cancelled")?.count), money(statusMap.get("cancelled")?.total_mad)),
  ];

  const deliveryCards = [
    card("Delivery Rate %", "نسبة التسليم %", percent(rateMap.get("delivery_rate")), "Delivered / Shipped"),
    card("Return Rate %", "نسبة الراجع %", percent(rateMap.get("return_rate")), "Returned / Shipped"),
    card("Cancellation Rate %", "نسبة الإلغاء %", percent(rateMap.get("cancellation_rate")), "Cancelled / Orders"),
    card("Confirmation Rate %", "نسبة التأكيد %", percent(rateMap.get("confirmation_rate")), "Confirmed / Orders"),
    card("Average Delivery Time", "متوسط مدة التسليم", `${rateMap.get("average_delivery_time") ?? 0} ${isArabic ? "يوم" : "days"}`, INTEGRATION_NOTE[lang]),
  ];

  const profitCards = [
    card("Gross Revenue", "إجمالي المداخيل", money(analytics?.total_revenue_mad), isArabic ? "من قاعدة الطلبات" : "From orders DB"),
    card("Product Cost", "تكلفة المنتج", money(0), INTEGRATION_NOTE[lang]),
    card("Shipping Cost", "تكلفة الشحن", money(0), INTEGRATION_NOTE[lang]),
    card("Ads Cost", "تكلفة الإعلانات", money(0), INTEGRATION_NOTE[lang]),
    card("Net Profit", "صافي الربح", money(analytics?.total_revenue_mad), isArabic ? "قبل إدخال التكاليف" : "Before costs"),
    card("Profit Margin %", "هامش الربح %", percent(analytics?.total_revenue_mad ? 100 : 0), isArabic ? "تقديري" : "Estimated"),
  ];

  if (!savedKey) {
    return (
      <section dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-[#F5F7FB] px-4 py-10 text-[#102033]">
        <div className="mx-auto max-w-md rounded-[32px] border border-white bg-white p-6 shadow-2xl shadow-slate-900/10">
          <div className="mb-5 flex justify-end">
            <LanguageToggle lang={lang} setLang={setLang} />
          </div>
          <p className="text-sm font-black text-[#1E4A8C]">Tawazon Admin</p>
          <h1 className="mt-2 text-3xl font-black">{isArabic ? "لوحة تحكم المتجر" : "Store Admin Dashboard"}</h1>
          <p className="mt-3 text-sm font-semibold leading-7 text-[#667085]">
            {isArabic
              ? "دخل مفتاح الإدارة باش تشوف الطلبات، المداخيل، التحليلات، ونسخة CEO كاملة."
              : "Enter the admin key to access orders, revenue, analytics, and the CEO dashboard."}
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
              {isArabic ? "دخول للوحة التحكم" : "Open Dashboard"}
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-[#F5F7FB] text-[#102033]">
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-black text-[#1E4A8C]">Tawazon Health Admin</p>
            <h1 className="text-3xl font-black">{isArabic ? "CEO Master Dashboard" : "CEO Master Dashboard"}</h1>
            <p className="mt-1 text-sm font-bold text-[#667085]">
              {isArabic ? "نسخة عامة بالعربية والإنجليزية لإدارة متجر COD" : "Bilingual general version for COD ecommerce operations"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <LanguageToggle lang={lang} setLang={setLang} />
            <button onClick={() => void loadDashboard()} className="rounded-full bg-[#1E4A8C] px-5 py-2 text-sm font-black text-white">
              {loading ? (isArabic ? "كيتم التحديث..." : "Refreshing...") : isArabic ? "تحديث البيانات" : "Refresh Data"}
            </button>
            <button onClick={handleLogout} className="rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-black text-[#667085]">
              {isArabic ? "خروج" : "Logout"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        {error ? <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}

        <DashboardSection title="Date Filters" titleAr="فلاتر التاريخ" subtitle="Choose the active reporting window" subtitleAr="اختار الفترة اللي بغيتي تشوف عليها الأرقام" lang={lang}>
          <div className="flex flex-wrap gap-2">
            {DATE_FILTERS.map((item) => (
              <button
                key={item.days}
                onClick={() => setDays(item.days)}
                className={`rounded-full px-4 py-2 text-xs font-black transition ${
                  days === item.days ? "bg-[#1E4A8C] text-white" : "bg-white text-[#667085] ring-1 ring-gray-200"
                }`}
              >
                {isArabic ? item.ar : item.en}
              </button>
            ))}
            <button className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#667085] ring-1 ring-dashed ring-gray-300">
              {isArabic ? "تاريخ مخصص" : "Custom Date"}
            </button>
          </div>
        </DashboardSection>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label={isArabic ? "Revenue" : "Revenue"} value={money(analytics?.total_revenue_mad)} note={`${count(analytics?.total_orders)} ${isArabic ? "طلب" : "orders"}`} />
          <KpiCard label={isArabic ? "Orders" : "Orders"} value={count(analytics?.total_orders)} note={isArabic ? "إجمالي الطلبات" : "Total orders"} />
          <KpiCard label={isArabic ? "Delivered" : "Delivered"} value={count(statusMap.get("delivered")?.count)} note={percent(rateMap.get("delivery_rate"))} tone="green" />
          <KpiCard label={isArabic ? "Profit" : "Profit"} value={money(analytics?.total_revenue_mad)} note={isArabic ? "قبل التكاليف" : "Before costs"} tone="blue" />
        </div>

        <DashboardSection title="Home Dashboard - CEO View" titleAr="الرئيسية - نظرة CEO" subtitle="The most important ecommerce and COD KPIs" subtitleAr="أهم مؤشرات التجارة و COD" lang={lang}>
          <KpiGroup title="Sales" titleAr="المبيعات" cards={revenueCards} lang={lang} />
          <KpiGroup title="Orders" titleAr="الطلبات" cards={orderCards} lang={lang} />
          <KpiGroup title="Delivery" titleAr="التوصيل" cards={deliveryCards} lang={lang} />
          <KpiGroup title="Profit" titleAr="الربح" cards={profitCards} lang={lang} />
        </DashboardSection>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <DashboardSection title="Revenue Section" titleAr="قسم المداخيل" subtitle="Hourly, daily, weekly, and monthly reporting foundation" subtitleAr="أساس تتبع المداخيل بالساعة، اليوم، الأسبوع، والشهر" lang={lang}>
            <div className="flex flex-wrap gap-2">
              {["Hourly", "Daily", "Weekly", "Monthly"].map((item) => (
                <span key={item} className="rounded-full bg-[#EEF5FF] px-3 py-1 text-xs font-black text-[#1E4A8C]">
                  {translateChartMode(item, lang)}
                </span>
              ))}
            </div>
            <div className="mt-6 flex h-64 items-end gap-2 overflow-x-auto rounded-3xl bg-[#F8FAFC] p-4">
              {(analytics?.daily_revenue ?? []).map((item) => (
                <div key={item.date} className="flex min-w-12 flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-2xl bg-gradient-to-t from-[#1E4A8C] to-[#60A5FA]"
                    style={{ height: `${Math.max(8, (item.total_mad / maxDailyRevenue) * 190)}px` }}
                    title={`${item.date}: ${formatMad(item.total_mad)}`}
                  />
                  <span className="text-[10px] font-bold text-[#667085]">{item.date.slice(5)}</span>
                </div>
              ))}
              {!analytics?.daily_revenue.length ? <EmptyState text={isArabic ? "مازال ماكايناش بيانات كافية للرسم." : "Not enough data for this chart yet."} /> : null}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <CompareCard label={isArabic ? "اليوم vs البارح" : "Today vs Yesterday"} left={money(periodMap.get("today")?.revenue_mad)} right={money(periodMap.get("yesterday")?.revenue_mad)} />
              <CompareCard label={isArabic ? "هذا الأسبوع vs الماضي" : "This Week vs Last Week"} left={money(periodMap.get("last_7_days")?.revenue_mad)} right={INTEGRATION_NOTE[lang]} />
              <CompareCard label={isArabic ? "هذا الشهر vs الماضي" : "This Month vs Last Month"} left={money(periodMap.get("this_month")?.revenue_mad)} right={money(periodMap.get("last_month")?.revenue_mad)} />
              <CompareCard label={isArabic ? "هذه السنة vs الماضية" : "This Year vs Last Year"} left={money(periodMap.get("this_year")?.revenue_mad)} right={money(periodMap.get("last_year")?.revenue_mad)} />
            </div>
          </DashboardSection>

          <DashboardSection title="Orders Section" titleAr="قسم الطلبات" subtitle="Status breakdown and order funnel" subtitleAr="توزيع الحالات و funnel ديال الطلبات" lang={lang}>
            <div className="space-y-3">
              {ORDER_STATUSES.map((item) => (
                <MetricRow key={item.value} label={isArabic ? item.ar : item.en} value={`${statusMap.get(item.value)?.count ?? 0}`} sub={money(statusMap.get(item.value)?.total_mad)} />
              ))}
            </div>
            <div className="mt-6 space-y-3 rounded-3xl bg-[#F8FAFC] p-4">
              {(analytics?.order_funnel ?? []).map((step, index) => (
                <div key={step.key}>
                  <MetricRow label={translateFunnel(step.label, lang)} value={`${step.count}`} sub={`${step.rate}%`} />
                  {index < (analytics?.order_funnel.length ?? 0) - 1 ? <div className="py-1 text-center text-[#1E4A8C]">↓</div> : null}
                </div>
              ))}
            </div>
          </DashboardSection>
        </div>

        <EnterpriseGrid lang={lang} analytics={analytics} statusMap={statusMap} />

        <OrdersControl
          lang={lang}
          orders={orders}
          query={query}
          setQuery={setQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          sheetFilter={sheetFilter}
          setSheetFilter={setSheetFilter}
          loadDashboard={() => void loadDashboard()}
          onStatusChange={handleStatusChange}
        />
      </div>
    </section>
  );
}

function EnterpriseGrid({
  lang,
  analytics,
  statusMap,
}: {
  lang: Lang;
  analytics: AdminAnalytics | null;
  statusMap: Map<string, { count: number; total_mad: number }>;
}) {
  const isArabic = lang === "ar";
  const blocks = [
    {
      title: "Ads Dashboard",
      titleAr: "لوحة الإعلانات",
      items: ["Spend", "Revenue", "ROAS", "CPA", "CPM", "CPC", "CTR", "Top Campaigns"],
      itemsAr: ["الإنفاق", "المداخيل", "ROAS", "CPA", "CPM", "CPC", "CTR", "أفضل الحملات"],
    },
    {
      title: "Products Dashboard",
      titleAr: "لوحة المنتجات",
      items: ["Best Sellers", "Top Product Today", "Top Product 7 Days", "Top Product 30 Days", "Revenue", "Orders", "Delivered", "Return Rate", "Profit"],
      itemsAr: ["الأكثر مبيعاً", "أفضل منتج اليوم", "أفضل منتج 7 أيام", "أفضل منتج 30 يوم", "المداخيل", "الطلبات", "المسلم", "نسبة الراجع", "الربح"],
    },
    {
      title: "Customers Dashboard",
      titleAr: "لوحة العملاء",
      items: ["New Customers", "Returning Customers", "LTV", "AOV", "Repeat Rate", "Total Orders"],
      itemsAr: ["عملاء جدد", "عملاء راجعين", "LTV", "AOV", "نسبة التكرار", "إجمالي الطلبات"],
    },
    {
      title: "Shipping Dashboard",
      titleAr: "لوحة الشحن",
      items: ["Amana", "Ozon", "Express Relais", "Chrono Diali", "Orders", "Delivered", "Returned", "Delivery Rate", "Avg Delivery Time", "Shipping Cost"],
      itemsAr: ["أمانة", "أوزون", "Express Relais", "Chrono Diali", "الطلبات", "المسلم", "الراجع", "نسبة التسليم", "متوسط التسليم", "تكلفة الشحن"],
    },
    {
      title: "Call Center Dashboard",
      titleAr: "لوحة مركز الاتصال",
      items: ["Agent Name", "Calls Today", "Confirmed", "Rejected", "Confirmation Rate", "Revenue Generated"],
      itemsAr: ["اسم العامل", "مكالمات اليوم", "مؤكد", "مرفوض", "نسبة التأكيد", "المداخيل المحققة"],
    },
    {
      title: "Stock Dashboard",
      titleAr: "لوحة المخزون",
      items: ["Total Products", "Active Products", "Low Stock", "Out Of Stock", "SKU", "Current Stock", "Reserved", "Available", "Sold", "Profit"],
      itemsAr: ["إجمالي المنتجات", "منتجات نشطة", "مخزون منخفض", "نفد المخزون", "SKU", "المخزون الحالي", "محجوز", "متاح", "مباع", "الربح"],
    },
    {
      title: "Finance Dashboard",
      titleAr: "لوحة المالية",
      items: ["Cash Flow", "Revenue", "Expenses", "Profit", "Ads", "Salaries", "Shipping", "Product Cost", "Software", "Misc"],
      itemsAr: ["التدفق النقدي", "المداخيل", "المصاريف", "الربح", "الإعلانات", "الأجور", "الشحن", "تكلفة المنتج", "البرامج", "متفرقات"],
    },
    {
      title: "Geo Dashboard",
      titleAr: "لوحة المدن",
      items: ["Morocco Map", "Revenue By City", "Casablanca", "Rabat", "Agadir", "Marrakech", "Fes", "Tangier", "Orders", "Delivery Rate", "Return Rate"],
      itemsAr: ["خريطة المغرب", "المداخيل حسب المدينة", "الدار البيضاء", "الرباط", "أكادير", "مراكش", "فاس", "طنجة", "الطلبات", "نسبة التسليم", "نسبة الراجع"],
    },
    {
      title: "Alert Center",
      titleAr: "مركز التنبيهات",
      items: ["Return Rate Product X > 35%", "Stock Product Y < 10", "ROAS Campaign Z < 1.5", "Delivery Rate City A < 60%"],
      itemsAr: ["نسبة الراجع لمنتج X أكبر من 35%", "مخزون منتج Y أقل من 10", "ROAS حملة Z أقل من 1.5", "نسبة تسليم مدينة A أقل من 60%"],
    },
    {
      title: "Team Dashboard",
      titleAr: "لوحة الفريق",
      items: ["Employees", "Performance", "Sales", "Orders", "Tasks", "Bonuses"],
      itemsAr: ["الموظفين", "الأداء", "المبيعات", "الطلبات", "المهام", "المكافآت"],
    },
    {
      title: "Automation Center",
      titleAr: "مركز الأتمتة",
      items: ["Auto Confirm", "Auto SMS", "Auto WhatsApp", "Auto Email", "Auto Return Detection", "Auto Refund", "Auto Inventory Sync"],
      itemsAr: ["تأكيد تلقائي", "SMS تلقائي", "WhatsApp تلقائي", "Email تلقائي", "كشف الراجع تلقائي", "Refund تلقائي", "مزامنة المخزون"],
    },
    {
      title: "AI Center",
      titleAr: "مركز الذكاء الاصطناعي",
      items: ["AI Sales Forecast", "AI Revenue Forecast", "AI Stock Forecast", "AI Return Prediction", "AI Fraud Detection", "What happened?", "Why happened?", "What to do next?"],
      itemsAr: ["توقع المبيعات", "توقع المداخيل", "توقع المخزون", "توقع الراجع", "كشف الاحتيال", "ماذا وقع؟", "لماذا وقع؟", "ماذا نفعل؟"],
    },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {blocks.map((block) => (
        <DashboardSection key={block.title} title={block.title} titleAr={block.titleAr} subtitle={INTEGRATION_NOTE.en} subtitleAr={INTEGRATION_NOTE.ar} lang={lang}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(isArabic ? block.itemsAr : block.items).map((item, index) => (
              <div key={`${block.title}-${item}`} className="rounded-2xl bg-[#F8FAFC] p-4">
                <p className="text-sm font-black">{item}</p>
                <p className="mt-2 text-2xl font-black text-[#1E4A8C]">
                  {enterpriseValue(block.title, index, analytics, statusMap, lang)}
                </p>
                <p className="mt-1 text-xs font-bold text-[#667085]">{INTEGRATION_NOTE[lang]}</p>
              </div>
            ))}
          </div>
        </DashboardSection>
      ))}
    </div>
  );
}

function OrdersControl({
  lang,
  orders,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  sheetFilter,
  setSheetFilter,
  loadDashboard,
  onStatusChange,
}: {
  lang: Lang;
  orders: AdminOrder[];
  query: string;
  setQuery: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  sheetFilter: string;
  setSheetFilter: (value: string) => void;
  loadDashboard: () => void;
  onStatusChange: (order: AdminOrder, status: string) => void;
}) {
  const isArabic = lang === "ar";
  return (
    <DashboardSection title="Orders Control Center" titleAr="مركز التحكم في الطلبات" subtitle="Search, filter, and update order status" subtitleAr="بحث، فلترة، وتغيير حالة الطلبات" lang={lang}>
      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={isArabic ? "بحث بالاسم، الهاتف، المدينة، أو رقم الطلب" : "Search name, phone, city, or order number"}
          className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#1E4A8C]"
        />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold">
          <option value="">{isArabic ? "كل الحالات" : "All statuses"}</option>
          {ORDER_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {isArabic ? item.ar : item.en}
            </option>
          ))}
        </select>
        <select value={sheetFilter} onChange={(event) => setSheetFilter(event.target.value)} className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold">
          <option value="">{isArabic ? "كل Google Sheet" : "All Sheet Sync"}</option>
          <option value="pending">pending</option>
          <option value="synced">synced</option>
          <option value="failed">failed</option>
          <option value="skipped">skipped</option>
        </select>
        <button onClick={loadDashboard} className="rounded-2xl bg-[#102033] px-5 py-3 text-sm font-black text-white">
          {isArabic ? "تطبيق" : "Apply"}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr className="text-xs font-black text-[#667085]">
              <th className="px-3 py-2">{isArabic ? "الطلب" : "Order"}</th>
              <th className="px-3 py-2">{isArabic ? "العميل" : "Customer"}</th>
              <th className="px-3 py-2">{isArabic ? "الهاتف" : "Phone"}</th>
              <th className="px-3 py-2">{isArabic ? "المدينة" : "City"}</th>
              <th className="px-3 py-2">{isArabic ? "العرض" : "Offer"}</th>
              <th className="px-3 py-2">{isArabic ? "المبلغ" : "Revenue"}</th>
              <th className="px-3 py-2">Sheet</th>
              <th className="px-3 py-2">{isArabic ? "الحالة" : "Status"}</th>
              <th className="px-3 py-2">{isArabic ? "التاريخ" : "Date"}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <OrderRow key={order.id} lang={lang} order={order} onStatusChange={onStatusChange} />
            ))}
          </tbody>
        </table>
        {!orders.length ? <EmptyState text={isArabic ? "ماكاين حتى طلب مطابق للفلاتر." : "No orders match these filters."} /> : null}
      </div>
    </DashboardSection>
  );
}

function KpiGroup({ title, titleAr, cards, lang }: { title: string; titleAr: string; cards: KpiData[]; lang: Lang }) {
  return (
    <div className="mt-6">
      <h3 className="mb-3 text-xl font-black">{lang === "ar" ? titleAr : title}</h3>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((item) => (
          <KpiCard key={item.en} label={lang === "ar" ? item.ar : item.en} value={item.value} note={item.note} />
        ))}
      </div>
    </div>
  );
}

function DashboardSection({
  title,
  titleAr,
  subtitle,
  subtitleAr,
  lang,
  children,
}: {
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  lang: Lang;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <p className="text-sm font-black text-[#1E4A8C]">{title}</p>
        <h2 className="text-2xl font-black">{lang === "ar" ? titleAr : title}</h2>
        <p className="mt-1 text-sm font-bold text-[#667085]">{lang === "ar" ? subtitleAr : subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function KpiCard({ label, value, note, tone = "blue" }: { label: string; value: string; note: string; tone?: "blue" | "green" | "red" }) {
  const toneClass = tone === "red" ? "text-red-600 bg-red-50" : tone === "green" ? "text-green-700 bg-green-50" : "text-[#1E4A8C] bg-[#EEF5FF]";
  return (
    <div className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-black text-[#667085]">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
      <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black ${toneClass}`}>{note}</span>
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

function CompareCard({ label, left, right }: { label: string; left: string; right: string }) {
  return (
    <div className="rounded-2xl bg-[#F8FAFC] p-4">
      <p className="text-sm font-black text-[#667085]">{label}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-lg font-black text-[#1E4A8C]">{left}</span>
        <span className="text-xs font-bold text-[#667085]">vs</span>
        <span className="text-lg font-black">{right}</span>
      </div>
    </div>
  );
}

function LanguageToggle({ lang, setLang }: { lang: Lang; setLang: (lang: Lang) => void }) {
  return (
    <div className="flex rounded-full bg-[#EEF5FF] p-1">
      {(["ar", "en"] as const).map((item) => (
        <button
          key={item}
          onClick={() => setLang(item)}
          className={`rounded-full px-4 py-2 text-xs font-black ${lang === item ? "bg-[#1E4A8C] text-white" : "text-[#1E4A8C]"}`}
        >
          {item === "ar" ? "العربية" : "English"}
        </button>
      ))}
    </div>
  );
}

function OrderRow({ lang, order, onStatusChange }: { lang: Lang; order: AdminOrder; onStatusChange: (order: AdminOrder, status: string) => void }) {
  const isArabic = lang === "ar";
  return (
    <tr className="rounded-2xl bg-white shadow-sm">
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
          className="rounded-full border border-gray-200 px-3 py-2 text-xs font-black"
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
  return <div className="flex min-h-24 items-center justify-center rounded-3xl bg-[#F8FAFC] p-6 text-center text-sm font-bold text-[#667085]">{text}</div>;
}

type KpiData = { en: string; ar: string; value: string; note: string };

function card(en: string, ar: string, value: string, note: string): KpiData {
  return { en, ar, value, note };
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

function ordersNote(value: number | undefined, lang: Lang) {
  return `${value ?? 0} ${lang === "ar" ? "طلب" : "orders"}`;
}

function translateChartMode(value: string, lang: Lang) {
  const ar: Record<string, string> = { Hourly: "بالساعة", Daily: "يومي", Weekly: "أسبوعي", Monthly: "شهري" };
  return lang === "ar" ? ar[value] ?? value : value;
}

function translateFunnel(value: string, lang: Lang) {
  const ar: Record<string, string> = { Orders: "طلبات", Confirmed: "مؤكد", Shipped: "مرسل", Delivered: "مسلم", Paid: "مدفوع" };
  return lang === "ar" ? ar[value] ?? value : value;
}

function enterpriseValue(
  section: string,
  index: number,
  analytics: AdminAnalytics | null,
  statusMap: Map<string, { count: number; total_mad: number }>,
  lang: Lang
) {
  if (section === "Products Dashboard" && index <= 2) return "Blood Sugar Complex";
  if (section === "Products Dashboard" && index === 4) return money(analytics?.total_revenue_mad);
  if (section === "Products Dashboard" && index === 5) return count(analytics?.total_orders);
  if (section === "Products Dashboard" && index === 6) return count(statusMap.get("delivered")?.count);
  if (section === "Geo Dashboard" && index === 1) return money(analytics?.total_revenue_mad);
  if (section === "Finance Dashboard" && index === 1) return money(analytics?.total_revenue_mad);
  if (section === "Finance Dashboard" && index === 3) return money(analytics?.total_revenue_mad);
  if (section === "Alert Center" && index === 0 && (statusMap.get("returned")?.count ?? 0) > 0) return lang === "ar" ? "راجع موجود" : "Returns exist";
  return "0";
}

function sheetClass(status: string) {
  if (status === "synced") return "bg-green-50 text-green-700";
  if (status === "failed") return "bg-red-50 text-red-700";
  if (status === "pending") return "bg-amber-50 text-amber-700";
  return "bg-gray-100 text-gray-700";
}

function formatDate(value: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-MA" : "en-MA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function errorMessage(err: unknown, lang: Lang) {
  if (err instanceof ApiError) return typeof err.message === "string" ? err.message : fallbackError(lang);
  if (err instanceof Error) return err.message;
  return fallbackError(lang);
}

function fallbackError(lang: Lang) {
  return lang === "ar" ? "تعذر تحميل بيانات الإدارة." : "Could not load admin data.";
}
