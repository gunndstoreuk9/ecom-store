"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, Download, Moon, RefreshCw, Sun, TrendingDown, TrendingUp } from "lucide-react";
import { ApiError, StoreAnalytics, getStoreAnalytics } from "@/lib/api";
import { formatMad } from "@/lib/currency";

type Lang = "en" | "ar";

const ADMIN_KEY_STORAGE = "tawazon_admin_key";
const LANG_STORAGE = "tawazon_admin_lang";
const THEME_STORAGE = "tawazon_store_analytics_theme";

const DATE_FILTERS = [
  { days: 1, en: "Today", ar: "اليوم" },
  { days: 2, en: "Yesterday / 2D", ar: "يومين" },
  { days: 3, en: "3 Days", ar: "3 أيام" },
  { days: 7, en: "7 Days", ar: "7 أيام" },
  { days: 15, en: "15 Days", ar: "15 يوم" },
  { days: 30, en: "30 Days", ar: "30 يوم" },
  { days: 60, en: "60 Days", ar: "60 يوم" },
  { days: 90, en: "90 Days", ar: "90 يوم" },
  { days: 365, en: "365 Days", ar: "365 يوم" },
];

export default function StoreAnalyticsPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const [dark, setDark] = useState(true);
  const [adminKey, setAdminKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [days, setDays] = useState(30);
  const [data, setData] = useState<StoreAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isArabic = lang === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);
  const currentKey = savedKey || adminKey;

  useEffect(() => {
    const storedKey = window.localStorage.getItem(ADMIN_KEY_STORAGE) ?? "";
    const storedLang = window.localStorage.getItem(LANG_STORAGE);
    const storedTheme = window.localStorage.getItem(THEME_STORAGE);
    if (storedLang === "en" || storedLang === "ar") setLang(storedLang);
    if (storedTheme === "light") setDark(false);
    if (storedKey) {
      setAdminKey(storedKey);
      setSavedKey(storedKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LANG_STORAGE, lang);
  }, [lang]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE, dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    if (!savedKey) return;
    void load(savedKey);
    const timer = window.setInterval(() => void load(savedKey, true), 12000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey, days]);

  async function load(key = currentKey, silent = false) {
    if (!key) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      setData(await getStoreAnalytics(key, days));
    } catch (err) {
      setError(errorMessage(err, lang));
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
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

  const card = dark ? "bg-[#121A2C] border-white/5" : "bg-white border-gray-100";
  const bg = dark ? "bg-[#0A0F1C] text-slate-100" : "bg-[#F5F7FB] text-[#102033]";
  const subtle = dark ? "text-slate-400" : "text-[#667085]";
  const chip = dark ? "bg-white/5 text-slate-300" : "bg-[#F1F5F9] text-[#475569]";
  const input = dark ? "bg-[#0E1626] border-white/10 text-slate-100" : "bg-white border-gray-200 text-[#102033]";

  const maxRevenue = useMemo(() => Math.max(1, ...(data?.trends ?? []).map((item) => item.revenue_mad)), [data]);

  if (!savedKey) {
    return (
      <section dir={isArabic ? "rtl" : "ltr"} className={`flex min-h-screen items-center justify-center px-4 ${bg}`}>
        <form onSubmit={handleLogin} className={`w-full max-w-md rounded-3xl border p-8 shadow-xl ${card}`}>
          <h1 className="text-2xl font-black">{t("Store Analytics", "تحليلات المتجر")}</h1>
          <p className={`mt-1 text-sm ${subtle}`}>{t("Admin access required.", "خاص دخول الأدمين.")}</p>
          <input
            type="password"
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            placeholder={t("Admin API key", "مفتاح الأدمين")}
            className={`mt-6 w-full rounded-2xl border px-4 py-3 text-sm font-bold outline-none ${input}`}
          />
          <button className="mt-3 w-full rounded-2xl bg-[#2563EB] px-4 py-3 text-sm font-black text-white">{t("Enter", "دخول")}</button>
        </form>
      </section>
    );
  }

  return (
    <section dir={isArabic ? "rtl" : "ltr"} className={`min-h-screen ${bg}`}>
      <header className="sticky top-0 z-40 bg-gradient-to-l from-[#0B1724] to-[#2563EB] text-white shadow-lg">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 transition hover:bg-white/25">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-white/70">Analytics</p>
              <h1 className="text-xl font-black">{t("Store Analytics", "تحليلات المتجر")}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setDark((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="flex rounded-full bg-white/15 p-1">
              {(["ar", "en"] as const).map((item) => (
                <button key={item} onClick={() => setLang(item)} className={`rounded-full px-3 py-1.5 text-xs font-black ${lang === item ? "bg-white text-[#2563EB]" : "text-white"}`}>
                  {item === "ar" ? "العربية" : "EN"}
                </button>
              ))}
            </div>
            <button onClick={() => exportCsv(data)} className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black transition hover:bg-white/25">
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button onClick={() => void load()} className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black transition hover:bg-white/25">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {t("Refresh", "تحديث")}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] space-y-5 px-4 py-6 sm:px-6">
        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div> : null}

        <div className="flex flex-wrap gap-2">
          {DATE_FILTERS.map((item) => (
            <button key={item.days} onClick={() => setDays(item.days)} className={`rounded-full px-3 py-1.5 text-xs font-black ${days === item.days ? "bg-[#2563EB] text-white" : chip}`}>
              {t(item.en, item.ar)}
            </button>
          ))}
        </div>

        {data ? (
          <>
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
              {data.executive_kpis.map((kpi) => (
                <Kpi key={kpi.key} card={card} subtle={subtle} kpi={kpi} />
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-4">
              <RealtimeCard data={data} card={card} subtle={subtle} />
              <CodCard data={data} card={card} subtle={subtle} />
              <CustomerCard data={data} card={card} subtle={subtle} />
              <FunnelCard data={data} card={card} subtle={subtle} />
            </section>

            <section className={`rounded-3xl border p-5 ${card}`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-black">{t("Revenue & Traffic Trend", "تطور المداخيل والزوار")}</h2>
                <BarChart3 className={`h-5 w-5 ${subtle}`} />
              </div>
              <div className="flex h-64 items-end gap-2 overflow-x-auto">
                {data.trends.map((point) => (
                  <div key={point.date} className="flex min-w-12 flex-1 flex-col items-center gap-2">
                    <div className="flex h-52 w-full items-end rounded-t-xl bg-[#2563EB]/10">
                      <div className="w-full rounded-t-xl bg-[#2563EB]" style={{ height: `${Math.max(4, (point.revenue_mad / maxRevenue) * 100)}%` }} />
                    </div>
                    <span className={`text-[10px] font-bold ${subtle}`}>{point.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <TableCard title={t("Traffic Sources", "مصادر الزيارات")} card={card} subtle={subtle} columns={[t("Source", "المصدر"), t("Visitors", "زوار"), t("Orders", "طلبات"), t("Revenue", "مداخيل"), "CR"]}>
                {data.traffic_sources.map((row) => (
                  <tr key={row.source}><td>{row.source}</td><td>{row.visitors}</td><td>{row.orders}</td><td>{formatMad(row.revenue_mad)}</td><td>{row.conversion_rate}%</td></tr>
                ))}
              </TableCard>
              <TableCard title={t("Geographic Analytics", "تحليلات المدن")} card={card} subtle={subtle} columns={[t("City", "المدينة"), t("Orders", "طلبات"), t("Revenue", "مداخيل"), t("Delivery", "التسليم")]}>
                {data.geo.map((row) => (
                  <tr key={row.city}><td>{row.city}</td><td>{row.orders}</td><td>{formatMad(row.revenue_mad)}</td><td>{row.delivery_rate}%</td></tr>
                ))}
              </TableCard>
              <TableCard title={t("Product Analytics", "تحليلات المنتجات")} card={card} subtle={subtle} columns={[t("Product", "المنتج"), t("Views", "مشاهدات"), t("Orders", "طلبات"), t("Revenue", "مداخيل"), "CR", t("Delivery", "تسليم")]}>
                {data.products.map((row) => (
                  <tr key={row.product_name}><td>{row.product_name}</td><td>{row.views}</td><td>{row.orders}</td><td>{formatMad(row.revenue_mad)}</td><td>{row.conversion_rate}%</td><td>{row.delivery_rate}%</td></tr>
                ))}
              </TableCard>
              <TableCard title={t("Landing Page Analytics", "تحليلات صفحات الهبوط")} card={card} subtle={subtle} columns={[t("Page", "الصفحة"), t("Visitors", "زوار"), t("Orders", "طلبات"), t("Confirmed", "مؤكدة"), t("Delivered", "مسلمة"), t("Revenue", "مداخيل"), "CR"]}>
                {data.landing_pages.map((row) => (
                  <tr key={row.page}><td>{row.page}</td><td>{row.visitors}</td><td>{row.orders}</td><td>{row.confirmed_orders}</td><td>{row.delivered_orders}</td><td>{formatMad(row.revenue_mad)}</td><td>{row.conversion_rate}%</td></tr>
                ))}
              </TableCard>
            </section>

            {data.notes?.length ? (
              <div className={`rounded-3xl border p-4 text-xs font-bold ${card} ${subtle}`}>
                {data.notes.map((note) => <p key={note}>• {note}</p>)}
              </div>
            ) : null}
          </>
        ) : (
          <p className={subtle}>{t("Loading analytics...", "كيتم تحميل التحليلات...")}</p>
        )}
      </main>
    </section>
  );
}

function Kpi({ card, subtle, kpi }: { card: string; subtle: string; kpi: StoreAnalytics["executive_kpis"][number] }) {
  const up = kpi.comparison.yesterday_pct >= 0;
  return (
    <div className={`rounded-3xl border p-4 ${card}`}>
      <p className={`text-[10px] font-black uppercase tracking-wide ${subtle}`}>{kpi.label}</p>
      <p className="mt-1 text-2xl font-black">{kpi.unit === "MAD" ? formatMad(kpi.value) : Math.round(kpi.value).toLocaleString()}</p>
      <span className={`mt-2 inline-flex items-center gap-1 text-[11px] font-black ${up ? "text-emerald-500" : "text-rose-500"}`}>
        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {kpi.comparison.yesterday_pct}% vs yesterday
      </span>
    </div>
  );
}

function RealtimeCard({ data, card, subtle }: { data: StoreAnalytics; card: string; subtle: string }) {
  return <InfoCard title="Real-Time" card={card} subtle={subtle} rows={[
    ["Active Visitors", data.realtime.active_visitors],
    ["Orders Today", data.realtime.orders_today],
    ["Orders This Hour", data.realtime.orders_this_hour],
    ["Revenue Today", formatMad(data.realtime.revenue_today_mad)],
    ["Revenue This Hour", formatMad(data.realtime.revenue_this_hour_mad)],
  ]} />;
}

function CodCard({ data, card, subtle }: { data: StoreAnalytics; card: string; subtle: string }) {
  return <InfoCard title="COD Performance" card={card} subtle={subtle} rows={[
    ["Confirmation Rate", `${data.cod.confirmation_rate}%`],
    ["Shipping Rate", `${data.cod.shipping_rate}%`],
    ["Delivery Rate", `${data.cod.delivery_rate}%`],
    ["Cancellation Rate", `${data.cod.cancellation_rate}%`],
    ["Return Rate", `${data.cod.return_rate}%`],
  ]} />;
}

function CustomerCard({ data, card, subtle }: { data: StoreAnalytics; card: string; subtle: string }) {
  return <InfoCard title="Customer Analytics" card={card} subtle={subtle} rows={[
    ["Total Customers", data.customer.total_customers],
    ["New Customers", data.customer.new_customers],
    ["Returning Customers", data.customer.returning_customers],
    ["Repeat Rate", `${data.customer.repeat_purchase_rate}%`],
    ["CLV", formatMad(data.customer.customer_lifetime_value_mad)],
  ]} />;
}

function FunnelCard({ data, card, subtle }: { data: StoreAnalytics; card: string; subtle: string }) {
  return (
    <div className={`rounded-3xl border p-5 ${card}`}>
      <h2 className="mb-4 text-base font-black">Conversion Funnel</h2>
      <div className="space-y-2">
        {data.funnel.map((step) => (
          <div key={step.key}>
            <div className="flex justify-between text-xs font-black"><span>{step.label}</span><span>{step.count.toLocaleString()} · drop {step.dropoff_rate}%</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-500/15"><div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${Math.min(100, step.step_rate)}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoCard({ title, card, subtle, rows }: { title: string; card: string; subtle: string; rows: [string, string | number][] }) {
  return (
    <div className={`rounded-3xl border p-5 ${card}`}>
      <h2 className="mb-4 text-base font-black">{title}</h2>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-sm"><span className={subtle}>{label}</span><b>{value}</b></div>
        ))}
      </div>
    </div>
  );
}

function TableCard({ title, card, subtle, columns, children }: { title: string; card: string; subtle: string; columns: string[]; children: ReactNode }) {
  return (
    <div className={`overflow-hidden rounded-3xl border ${card}`}>
      <div className="flex items-center justify-between px-5 py-4"><h2 className="text-base font-black">{title}</h2></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={`text-xs ${subtle}`}><tr>{columns.map((column) => <th key={column} className="px-4 py-3 text-start font-black">{column}</th>)}</tr></thead>
          <tbody className="[&_td]:px-4 [&_td]:py-3">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function exportCsv(data: StoreAnalytics | null) {
  if (!data) return;
  const rows = [["metric", "value"], ...data.executive_kpis.map((kpi) => [kpi.label, String(kpi.value)])];
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "store-analytics.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function errorMessage(err: unknown, lang: Lang): string {
  const isArabic = lang === "ar";
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return isArabic ? "وقع خطأ غير متوقع." : "Unexpected error.";
}
