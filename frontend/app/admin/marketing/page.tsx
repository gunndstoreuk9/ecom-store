"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Activity,
  BarChart3,
  CheckCircle2,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Sun,
  Trash2,
  Pencil,
  Power,
  ShieldAlert,
  Send,
  ScrollText,
  Wallet,
} from "lucide-react";
import {
  ApiError,
  TrackingAnalytics,
  TrackingLog,
  TrackingMeta,
  TrackingPixel,
  TrackingPixelPayload,
  TrackingPlatform,
  createTrackingPixel,
  deleteTrackingPixel,
  getTrackingAnalytics,
  getTrackingLogs,
  getTrackingMeta,
  getTrackingPixels,
  testTrackingPixel,
  updateTrackingPixel,
  upsertTrackingSpend,
} from "@/lib/api";
import { formatMad } from "@/lib/currency";

type Lang = "en" | "ar";
type TabId = "overview" | "pixels" | "logs";

const ADMIN_KEY_STORAGE = "tawazon_admin_key";
const LANG_STORAGE = "tawazon_admin_lang";
const THEME_STORAGE = "tawazon_marketing_theme";

const PLATFORM_LABELS: Record<TrackingPlatform, string> = {
  meta: "Meta (Facebook & Instagram)",
  tiktok: "TikTok Ads",
  google_ads: "Google Ads",
  youtube: "YouTube Ads",
  ga4: "Google Analytics 4",
};

const PLATFORM_SHORT: Record<TrackingPlatform, string> = {
  meta: "Meta",
  tiktok: "TikTok",
  google_ads: "Google Ads",
  youtube: "YouTube",
  ga4: "GA4",
};

const DATE_FILTERS = [
  { days: 1, en: "Today", ar: "اليوم" },
  { days: 2, en: "2 Days", ar: "يومين" },
  { days: 3, en: "3 Days", ar: "3 أيام" },
  { days: 7, en: "7 Days", ar: "7 أيام" },
  { days: 15, en: "15 Days", ar: "15 يوم" },
  { days: 30, en: "30 Days", ar: "30 يوم" },
  { days: 60, en: "60 Days", ar: "60 يوم" },
  { days: 90, en: "90 Days", ar: "90 يوم" },
  { days: 365, en: "365 Days", ar: "365 يوم" },
] as const;

const HEALTH_DOT: Record<string, string> = {
  excellent: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-rose-500",
};

const HEALTH_TEXT: Record<string, string> = {
  excellent: "text-emerald-500",
  warning: "text-amber-500",
  critical: "text-rose-500",
};

export default function MarketingPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const [dark, setDark] = useState(true);
  const [adminKey, setAdminKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [meta, setMeta] = useState<TrackingMeta | null>(null);
  const [pixels, setPixels] = useState<TrackingPixel[]>([]);
  const [analytics, setAnalytics] = useState<TrackingAnalytics | null>(null);
  const [logs, setLogs] = useState<TrackingLog[]>([]);
  const [days, setDays] = useState(7);

  const [query, setQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [editing, setEditing] = useState<TrackingPixel | null>(null);
  const [creating, setCreating] = useState(false);

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
    void loadAll(savedKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  useEffect(() => {
    if (!savedKey) return;
    getTrackingAnalytics(savedKey, days).then(setAnalytics).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  async function loadAll(key = currentKey) {
    if (!key) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const [m, p, a, l] = await Promise.all([
        getTrackingMeta(key),
        getTrackingPixels(key),
        getTrackingAnalytics(key, days),
        getTrackingLogs(key, { limit: 200 }),
      ]);
      setMeta(m);
      setPixels(p);
      setAnalytics(a);
      setLogs(l.logs);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
        window.localStorage.removeItem(ADMIN_KEY_STORAGE);
        setSavedKey("");
      } else if (err instanceof ApiError && err.status === 401) {
        window.localStorage.removeItem(ADMIN_KEY_STORAGE);
        setSavedKey("");
        setError(t("Invalid admin key.", "مفتاح الأدمين غير صحيح."));
      } else {
        setError(errorMessage(err, lang));
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

  const filteredPixels = useMemo(() => {
    return pixels.filter((p) => {
      if (platformFilter && p.platform !== platformFilter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.pixel_id.toLowerCase().includes(q);
    });
  }, [pixels, platformFilter, query]);

  // === theme tokens ===
  const bg = dark ? "bg-[#0A0F1C] text-slate-100" : "bg-[#F5F7FB] text-[#102033]";
  const card = dark ? "bg-[#121A2C] border-white/5" : "bg-white border-gray-100";
  const subtle = dark ? "text-slate-400" : "text-[#667085]";
  const chip = dark ? "bg-white/5 text-slate-300" : "bg-[#F1F5F9] text-[#475569]";
  const inputCls = dark
    ? "bg-[#0E1626] border-white/10 text-slate-100 placeholder:text-slate-500"
    : "bg-white border-gray-200 text-[#102033]";

  if (!savedKey) {
    return (
      <LoginScreen
        dark={dark}
        lang={lang}
        adminKey={adminKey}
        setAdminKey={setAdminKey}
        onSubmit={handleLogin}
        forbidden={forbidden}
        t={t}
      />
    );
  }

  return (
    <section dir={isArabic ? "rtl" : "ltr"} className={`min-h-screen ${bg}`}>
      <header className="sticky top-0 z-40 bg-gradient-to-l from-[#0B1724] to-[#5B21B6] text-white shadow-lg">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 transition hover:bg-white/25">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-white/70">{t("Marketing", "التسويق")}</p>
              <h1 className="text-xl font-black">{t("Pixels & Tracking Center", "مركز البيكسلات والتتبع")}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setDark((v) => !v)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="flex rounded-full bg-white/15 p-1">
              {(["ar", "en"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setLang(item)}
                  className={`rounded-full px-3 py-1.5 text-xs font-black ${lang === item ? "bg-white text-[#5B21B6]" : "text-white"}`}
                >
                  {item === "ar" ? "العربية" : "EN"}
                </button>
              ))}
            </div>
            <button onClick={() => void loadAll()} className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black transition hover:bg-white/25">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {t("Refresh", "تحديث")}
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-[1320px] gap-1 px-4 sm:px-6">
          {([
            { id: "overview", en: "Analytics", ar: "التحليلات", Icon: BarChart3 },
            { id: "pixels", en: "Pixels", ar: "البيكسلات", Icon: Activity },
            { id: "logs", en: "Logs", ar: "السجلات", Icon: ScrollText },
          ] as const).map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm font-black transition ${
                tab === item.id ? "bg-[#0A0F1C] text-white" : "text-white/70 hover:text-white"
              }`}
            >
              <item.Icon className="h-4 w-4" />
              {t(item.en, item.ar)}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6">
        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>
        ) : null}

        {tab === "overview" ? (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {DATE_FILTERS.map((f) => (
                <button
                  key={f.days}
                  onClick={() => setDays(f.days)}
                  className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                    days === f.days ? "bg-[#5B21B6] text-white" : `${chip} hover:opacity-80`
                  }`}
                >
                  {t(f.en, f.ar)}
                </button>
              ))}
            </div>

            {analytics ? (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Kpi card={card} subtle={subtle} label={t("Total Events", "مجموع الأحداث")} value={analytics.total_events.toLocaleString()} />
                  <Kpi card={card} subtle={subtle} label={t("Purchases", "المشتريات")} value={analytics.total_purchases.toLocaleString()} />
                  <Kpi card={card} subtle={subtle} label={t("Leads", "العملاء المحتملون")} value={analytics.total_leads.toLocaleString()} />
                  <Kpi card={card} subtle={subtle} label={t("Conversion Rate", "نسبة التحويل")} value={`${analytics.conversion_rate}%`} />
                  <Kpi card={card} subtle={subtle} label={t("Ad Spend", "مصاريف الإعلانات")} value={formatMad(analytics.spend_mad)} />
                  <Kpi card={card} subtle={subtle} label="ROAS" value={analytics.roas != null ? `${analytics.roas}x` : "—"} />
                  <Kpi card={card} subtle={subtle} label={t("Cost / Lead", "تكلفة العميل")} value={analytics.cost_per_lead != null ? formatMad(analytics.cost_per_lead) : "—"} />
                  <Kpi card={card} subtle={subtle} label={t("Cost / Purchase", "تكلفة الشراء")} value={analytics.cost_per_purchase != null ? formatMad(analytics.cost_per_purchase) : "—"} />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className={`rounded-3xl border p-5 ${card}`}>
                    <p className={`mb-3 text-xs font-black uppercase tracking-wide ${subtle}`}>{t("Tracking Health Score", "مؤشر صحة التتبع")}</p>
                    <HealthGauge score={analytics.health_score} dark={dark} />
                  </div>
                  <div className={`rounded-3xl border p-5 lg:col-span-2 ${card}`}>
                    <p className={`mb-3 text-xs font-black uppercase tracking-wide ${subtle}`}>{t("Event Quality Monitoring", "مراقبة جودة الأحداث")}</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Quality label={t("Browser Events", "أحداث المتصفح")} value={analytics.browser_events.toLocaleString()} subtle={subtle} chip={chip} />
                      <Quality label={t("Server Events", "أحداث السيرفر")} value={analytics.server_events.toLocaleString()} subtle={subtle} chip={chip} />
                      <Quality
                        label={t("Deduplication", "إزالة التكرار")}
                        value={`${analytics.deduplication_rate}%`}
                        subtle={subtle}
                        chip={chip}
                        tone={analytics.deduplication_rate >= 80 ? "excellent" : analytics.deduplication_rate >= 40 ? "warning" : "critical"}
                      />
                      <Quality
                        label={t("Match Quality", "جودة المطابقة")}
                        value={`${analytics.event_match_quality}%`}
                        subtle={subtle}
                        chip={chip}
                        tone={analytics.event_match_quality >= 70 ? "excellent" : analytics.event_match_quality >= 40 ? "warning" : "critical"}
                      />
                    </div>
                  </div>
                </div>

                <div className={`overflow-hidden rounded-3xl border ${card}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className={`text-xs ${subtle}`}>
                        <tr className="text-start">
                          <th className="px-4 py-3 text-start font-black">{t("Platform", "المنصة")}</th>
                          <th className="px-4 py-3 text-start font-black">{t("Pixels", "بيكسلات")}</th>
                          <th className="px-4 py-3 text-start font-black">{t("Events", "أحداث")}</th>
                          <th className="px-4 py-3 text-start font-black">{t("Purchases", "مشتريات")}</th>
                          <th className="px-4 py-3 text-start font-black">{t("Spend", "مصاريف")}</th>
                          <th className="px-4 py-3 text-start font-black">ROAS</th>
                          <th className="px-4 py-3 text-start font-black">{t("Health", "الصحة")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.by_platform.map((p) => (
                          <tr key={p.platform} className={dark ? "border-t border-white/5" : "border-t border-gray-100"}>
                            <td className="px-4 py-3 font-black">{PLATFORM_SHORT[p.platform] ?? p.platform}</td>
                            <td className="px-4 py-3">{p.active}/{p.pixels}</td>
                            <td className="px-4 py-3">{p.total_events.toLocaleString()}</td>
                            <td className="px-4 py-3">{p.purchases.toLocaleString()}</td>
                            <td className="px-4 py-3">{formatMad(p.spend_mad)}</td>
                            <td className="px-4 py-3">{p.roas != null ? `${p.roas}x` : "—"}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 ${HEALTH_TEXT[p.health]}`}>
                                <span className={`h-2 w-2 rounded-full ${HEALTH_DOT[p.health]}`} />
                                {t(p.health, p.health === "excellent" ? "ممتاز" : p.health === "warning" ? "تحذير" : "حرج")}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {!analytics.by_platform.length ? (
                          <tr>
                            <td colSpan={7} className={`px-4 py-8 text-center ${subtle}`}>{t("No pixels configured yet.", "ماكاين حتى بيكسل مضاف.")}</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>

                <SpendEditor lang={lang} adminKey={currentKey} card={card} subtle={subtle} inputCls={inputCls} onSaved={() => void loadAll()} />
              </>
            ) : (
              <p className={subtle}>{t("Loading...", "كيتحمل...")}</p>
            )}
          </div>
        ) : null}

        {tab === "pixels" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className={`flex items-center gap-2 rounded-full border px-3 ${inputCls}`}>
                <Search className="h-4 w-4 opacity-60" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("Search pixels...", "بحث في البيكسلات...")}
                  className="bg-transparent py-2 text-sm font-bold outline-none"
                />
              </div>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className={`rounded-full border px-3 py-2 text-sm font-bold outline-none ${inputCls}`}
              >
                <option value="">{t("All platforms", "كل المنصات")}</option>
                {(Object.keys(PLATFORM_LABELS) as TrackingPlatform[]).map((p) => (
                  <option key={p} value={p}>{PLATFORM_SHORT[p]}</option>
                ))}
              </select>
              <button
                onClick={() => setCreating(true)}
                className="ms-auto flex items-center gap-2 rounded-full bg-[#5B21B6] px-4 py-2 text-sm font-black text-white transition hover:bg-[#4C1D95]"
              >
                <Plus className="h-4 w-4" />
                {t("Add Pixel", "إضافة بيكسل")}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredPixels.map((p) => (
                <PixelCard
                  key={p.id}
                  pixel={p}
                  dark={dark}
                  lang={lang}
                  card={card}
                  subtle={subtle}
                  chip={chip}
                  adminKey={currentKey}
                  onEdit={() => setEditing(p)}
                  onChanged={() => void loadAll()}
                  onError={(m) => setError(m)}
                />
              ))}
            </div>
            {!filteredPixels.length ? (
              <div className={`rounded-3xl border p-10 text-center ${card} ${subtle}`}>
                {t("No pixels found. Add your first tracking pixel.", "ماكاين حتى بيكسل. زيد أول بيكسل ديالك.")}
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "logs" ? (
          <LogsPanel logs={logs} dark={dark} lang={lang} card={card} subtle={subtle} chip={chip} />
        ) : null}
      </main>

      {(creating || editing) && meta ? (
        <PixelEditor
          dark={dark}
          lang={lang}
          meta={meta}
          adminKey={currentKey}
          pixel={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            void loadAll();
          }}
        />
      ) : null}
    </section>
  );
}
function LoginScreen({
  dark,
  lang,
  adminKey,
  setAdminKey,
  onSubmit,
  forbidden,
  t,
}: {
  dark: boolean;
  lang: Lang;
  adminKey: string;
  setAdminKey: (v: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  forbidden: boolean;
  t: (en: string, ar: string) => string;
}) {
  const isArabic = lang === "ar";
  return (
    <section dir={isArabic ? "rtl" : "ltr"} className={`flex min-h-screen items-center justify-center px-4 ${dark ? "bg-[#0A0F1C] text-slate-100" : "bg-[#F5F7FB] text-[#102033]"}`}>
      <div className={`w-full max-w-md rounded-3xl border p-8 shadow-xl ${dark ? "bg-[#121A2C] border-white/5" : "bg-white border-gray-100"}`}>
        <h1 className="text-2xl font-black">{t("Pixels & Tracking Center", "مركز البيكسلات والتتبع")}</h1>
        <p className={`mt-1 text-sm ${dark ? "text-slate-400" : "text-[#667085]"}`}>{t("Super admin access only.", "دخول للسوبر أدمين فقط.")}</p>
        {forbidden ? (
          <div className="mt-4 rounded-2xl border border-amber-300/40 bg-amber-500/10 p-3 text-sm font-bold text-amber-500">
            {t("This key is not authorized for the tracking center.", "هاد المفتاح ماعندوش صلاحية لمركز التتبع.")}
          </div>
        ) : null}
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder={t("Admin API key", "مفتاح الأدمين")}
            className={`w-full rounded-2xl border px-4 py-3 text-sm font-bold outline-none ${dark ? "bg-[#0E1626] border-white/10" : "bg-white border-gray-200"}`}
          />
          <button type="submit" className="w-full rounded-2xl bg-[#5B21B6] px-4 py-3 text-sm font-black text-white transition hover:bg-[#4C1D95]">
            {t("Enter", "دخول")}
          </button>
        </form>
        <Link href="/admin" className={`mt-4 block text-center text-xs font-bold ${dark ? "text-slate-400" : "text-[#667085]"}`}>
          {t("← Back to dashboard", "← الرجوع للوحة")}
        </Link>
      </div>
    </section>
  );
}

function Kpi({ card, subtle, label, value }: { card: string; subtle: string; label: string; value: string }) {
  return (
    <div className={`rounded-3xl border p-4 ${card}`}>
      <p className={`text-[11px] font-black uppercase tracking-wide ${subtle}`}>{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function Quality({ label, value, subtle, chip, tone }: { label: string; value: string; subtle: string; chip: string; tone?: string }) {
  return (
    <div className={`rounded-2xl p-3 ${chip}`}>
      <p className={`text-[10px] font-black uppercase ${subtle}`}>{label}</p>
      <p className={`mt-1 text-lg font-black ${tone ? HEALTH_TEXT[tone] : ""}`}>{value}</p>
    </div>
  );
}

function HealthGauge({ score, dark }: { score: number; dark: boolean }) {
  const tone = score >= 75 ? "excellent" : score >= 45 ? "warning" : "critical";
  const color = score >= 75 ? "#10b981" : score >= 45 ? "#f59e0b" : "#f43f5e";
  return (
    <div className="flex items-center gap-4">
      <div
        className="relative flex h-24 w-24 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${color} ${score * 3.6}deg, ${dark ? "#1e293b" : "#e2e8f0"} 0deg)` }}
      >
        <div className={`flex h-[76px] w-[76px] items-center justify-center rounded-full ${dark ? "bg-[#121A2C]" : "bg-white"}`}>
          <span className="text-2xl font-black">{score}</span>
        </div>
      </div>
      <div>
        <span className={`inline-flex items-center gap-1.5 text-sm font-black ${HEALTH_TEXT[tone]}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${HEALTH_DOT[tone]}`} />
          {tone === "excellent" ? "Excellent" : tone === "warning" ? "Warning" : "Critical"}
        </span>
        <p className="mt-1 text-xs opacity-60">/ 100</p>
      </div>
    </div>
  );
}

function PixelCard({
  pixel,
  dark,
  lang,
  card,
  subtle,
  chip,
  adminKey,
  onEdit,
  onChanged,
  onError,
}: {
  pixel: TrackingPixel;
  dark: boolean;
  lang: Lang;
  card: string;
  subtle: string;
  chip: string;
  adminKey: string;
  onEdit: () => void;
  onChanged: () => void;
  onError: (m: string) => void;
}) {
  const isArabic = lang === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);
  const [busy, setBusy] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [testMsg, setTestMsg] = useState<string | null>(null);

  async function toggleStatus() {
    setBusy(true);
    try {
      await updateTrackingPixel(adminKey, pixel.id, { status: pixel.status === "active" ? "disabled" : "active" });
      onChanged();
    } catch (err) {
      onError(errorMessage(err, lang));
    } finally {
      setBusy(false);
    }
  }

  async function runTest() {
    setBusy(true);
    setTestMsg(null);
    try {
      const r = await testTrackingPixel(adminKey, pixel.id);
      setTestMsg(r.message);
    } catch (err) {
      onError(errorMessage(err, lang));
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    setBusy(true);
    try {
      await deleteTrackingPixel(adminKey, pixel.id, pin);
      setPinOpen(false);
      setPin("");
      onChanged();
    } catch (err) {
      onError(errorMessage(err, lang));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rounded-3xl border p-5 ${card}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${chip}`}>
            {PLATFORM_SHORT[pixel.platform] ?? pixel.platform}
          </span>
          <h3 className="mt-2 text-base font-black">{pixel.name}</h3>
          <p className={`text-xs font-bold ${subtle}`}>{pixel.pixel_id}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-black ${HEALTH_TEXT[pixel.health]}`}>
          <span className={`h-2 w-2 rounded-full ${HEALTH_DOT[pixel.health]}`} />
          {pixel.status === "active" ? t("Active", "نشط") : t("Disabled", "معطل")}
        </span>
      </div>

      <div className={`mt-3 grid grid-cols-2 gap-2 text-xs ${subtle}`}>
        <span>{t("CAPI", "CAPI")}: <b className={dark ? "text-slate-200" : "text-[#102033]"}>{pixel.capi_enabled ? t("On", "مفعل") : t("Off", "مطفي")}</b></span>
        <span>{t("Token", "التوكن")}: <b className={dark ? "text-slate-200" : "text-[#102033]"}>{pixel.has_token ? pixel.token_masked : "—"}</b></span>
        <span>{t("Scope", "النطاق")}: <b className={dark ? "text-slate-200" : "text-[#102033]"}>{pixel.scope_type}</b></span>
        <span>{t("Events", "أحداث")}: <b className={dark ? "text-slate-200" : "text-[#102033]"}>{pixel.events_enabled?.length ?? 0}</b></span>
      </div>

      {testMsg ? <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-500">{testMsg}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => void runTest()} disabled={busy} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${chip} disabled:opacity-50`}>
          <Send className="h-3.5 w-3.5" /> {t("Test", "اختبار")}
        </button>
        <button onClick={onEdit} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${chip}`}>
          <Pencil className="h-3.5 w-3.5" /> {t("Edit", "تعديل")}
        </button>
        <button onClick={() => void toggleStatus()} disabled={busy} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${chip} disabled:opacity-50`}>
          <Power className="h-3.5 w-3.5" /> {pixel.status === "active" ? t("Disable", "تعطيل") : t("Enable", "تفعيل")}
        </button>
        <button onClick={() => setPinOpen((v) => !v)} className="flex items-center gap-1.5 rounded-full bg-rose-500/90 px-3 py-1.5 text-xs font-black text-white hover:bg-rose-600">
          <Trash2 className="h-3.5 w-3.5" /> {t("Delete", "حذف")}
        </button>
      </div>

      {pinOpen ? (
        <div className={`mt-3 flex flex-wrap items-center gap-2 rounded-2xl p-3 ${dark ? "bg-black/30" : "bg-rose-50"}`}>
          <ShieldAlert className="h-4 w-4 text-rose-500" />
          <span className="text-xs font-bold">{t("Admin PIN to delete", "رمز الأدمين للحذف")}</span>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            className={`rounded-lg border px-3 py-1.5 text-sm font-black outline-none ${dark ? "bg-[#0E1626] border-white/10 text-slate-100" : "bg-white border-gray-200"}`}
          />
          <button onClick={() => void doDelete()} disabled={busy || !pin} className="rounded-full bg-rose-500 px-4 py-1.5 text-xs font-black text-white disabled:opacity-50">
            {t("Confirm", "تأكيد")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PixelEditor({
  dark,
  lang,
  meta,
  adminKey,
  pixel,
  onClose,
  onSaved,
}: {
  dark: boolean;
  lang: Lang;
  meta: TrackingMeta;
  adminKey: string;
  pixel: TrackingPixel | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isArabic = lang === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);
  const isEdit = !!pixel;
  const [platform, setPlatform] = useState<TrackingPlatform>(pixel?.platform ?? "meta");
  const [name, setName] = useState(pixel?.name ?? "");
  const [pixelId, setPixelId] = useState(pixel?.pixel_id ?? "");
  const [token, setToken] = useState("");
  const [testCode, setTestCode] = useState(pixel?.test_event_code ?? "");
  const [capi, setCapi] = useState(pixel?.capi_enabled ?? false);
  const [scope, setScope] = useState(pixel?.scope_type ?? "store");
  const [scopeValue, setScopeValue] = useState(pixel?.scope_value ?? "");
  const [events, setEvents] = useState<string[]>(pixel?.events_enabled ?? meta.events);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const panel = dark ? "bg-[#121A2C] text-slate-100" : "bg-white text-[#102033]";
  const inputCls = dark ? "bg-[#0E1626] border-white/10 text-slate-100" : "bg-white border-gray-200";

  function toggleEvent(ev: string) {
    setEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));
  }

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const payload: TrackingPixelPayload = {
        name,
        pixel_id: pixelId,
        test_event_code: testCode || null,
        capi_enabled: capi,
        scope_type: scope as TrackingPixelPayload["scope_type"],
        scope_value: scopeValue || null,
        events_enabled: events,
      };
      if (token) {
        payload.access_token = token;
        payload.pin = pin;
      }
      if (isEdit) {
        await updateTrackingPixel(adminKey, pixel!.id, payload);
      } else {
        payload.platform = platform;
        await createTrackingPixel(adminKey, payload);
      }
      onSaved();
    } catch (e) {
      setErr(errorMessage(e, lang));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-10">
      <div className={`w-full max-w-2xl rounded-3xl p-6 shadow-2xl ${panel}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">{isEdit ? t("Edit Pixel", "تعديل البيكسل") : t("Add Pixel", "إضافة بيكسل")}</h2>
          <button onClick={onClose} className="text-sm font-black opacity-60">✕</button>
        </div>

        {err ? <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-500">{err}</p> : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-black uppercase opacity-70">
            {t("Platform", "المنصة")}
            <select
              disabled={isEdit}
              value={platform}
              onChange={(e) => setPlatform(e.target.value as TrackingPlatform)}
              className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none disabled:opacity-60 ${inputCls}`}
            >
              {(Object.keys(PLATFORM_LABELS) as TrackingPlatform[]).map((p) => (
                <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-black uppercase opacity-70">
            {t("Name / Label", "الاسم")}
            <input value={name} onChange={(e) => setName(e.target.value)} className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none ${inputCls}`} />
          </label>
          <label className="block text-xs font-black uppercase opacity-70">
            {t("Pixel ID", "معرّف البيكسل")}
            <input value={pixelId} onChange={(e) => setPixelId(e.target.value)} className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none ${inputCls}`} />
          </label>
          <label className="block text-xs font-black uppercase opacity-70">
            {t("Test Event Code", "رمز الاختبار")}
            <input value={testCode} onChange={(e) => setTestCode(e.target.value)} className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none ${inputCls}`} />
          </label>
          <label className="block text-xs font-black uppercase opacity-70">
            {t("Scope", "النطاق")}
            <select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none ${inputCls}`}>
              {meta.scope_types.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-black uppercase opacity-70">
            {t("Scope Value (optional)", "قيمة النطاق (اختياري)")}
            <input value={scopeValue} onChange={(e) => setScopeValue(e.target.value)} className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none ${inputCls}`} />
          </label>
          <label className="block text-xs font-black uppercase opacity-70 sm:col-span-2">
            {t("Access Token (CAPI) — changing requires PIN", "توكن الوصول (CAPI) — التغيير يتطلب PIN")}
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={pixel?.has_token ? "•••• " + (pixel.token_masked ?? "") : t("Leave empty to keep", "خليه فارغ للإبقاء")}
              className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none ${inputCls}`}
            />
          </label>
          {token ? (
            <label className="block text-xs font-black uppercase opacity-70 sm:col-span-2">
              {t("Admin PIN (required for token change)", "رمز الأدمين (مطلوب لتغيير التوكن)")}
              <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none ${inputCls}`} />
            </label>
          ) : null}
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={capi} onChange={(e) => setCapi(e.target.checked)} className="h-4 w-4" />
          {t("Enable Conversions API (server-side)", "تفعيل Conversions API (من السيرفر)")}
        </label>

        <div className="mt-4">
          <p className="text-xs font-black uppercase opacity-70">{t("Tracked Events", "الأحداث المتتبَّعة")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {meta.events.map((ev) => (
              <button
                key={ev}
                onClick={() => toggleEvent(ev)}
                className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                  events.includes(ev) ? "bg-[#5B21B6] text-white" : dark ? "bg-white/5 text-slate-300" : "bg-[#F1F5F9] text-[#475569]"
                }`}
              >
                {ev}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className={`rounded-full px-5 py-2 text-sm font-black ${dark ? "bg-white/10" : "bg-gray-100"}`}>
            {t("Cancel", "إلغاء")}
          </button>
          <button onClick={() => void save()} disabled={busy || !name || !pixelId} className="flex items-center gap-2 rounded-full bg-[#5B21B6] px-5 py-2 text-sm font-black text-white disabled:opacity-50">
            <CheckCircle2 className="h-4 w-4" />
            {t("Save", "حفظ")}
          </button>
        </div>
      </div>
    </div>
  );
}

function SpendEditor({
  lang,
  adminKey,
  card,
  subtle,
  inputCls,
  onSaved,
}: {
  lang: Lang;
  adminKey: string;
  card: string;
  subtle: string;
  inputCls: string;
  onSaved: () => void;
}) {
  const isArabic = lang === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);
  const today = new Date().toISOString().slice(0, 10);
  const [platform, setPlatform] = useState<TrackingPlatform>("meta");
  const [day, setDay] = useState(today);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function save() {
    setBusy(true);
    setDone(false);
    try {
      await upsertTrackingSpend(adminKey, platform, day, Number(amount) || 0);
      setDone(true);
      setAmount("");
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rounded-3xl border p-5 ${card}`}>
      <p className={`mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wide ${subtle}`}>
        <Wallet className="h-4 w-4" /> {t("Log Ad Spend (powers ROAS / CPL / CPP)", "تسجيل مصاريف الإعلانات (لحساب ROAS / CPL / CPP)")}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <select value={platform} onChange={(e) => setPlatform(e.target.value as TrackingPlatform)} className={`rounded-xl border px-3 py-2 text-sm font-bold outline-none ${inputCls}`}>
          {(Object.keys(PLATFORM_LABELS) as TrackingPlatform[]).map((p) => (
            <option key={p} value={p}>{PLATFORM_SHORT[p]}</option>
          ))}
        </select>
        <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={`rounded-xl border px-3 py-2 text-sm font-bold outline-none ${inputCls}`} />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder={t("Amount (MAD)", "المبلغ (درهم)")}
          className={`rounded-xl border px-3 py-2 text-sm font-bold outline-none ${inputCls}`}
        />
        <button onClick={() => void save()} disabled={busy || !amount} className="rounded-full bg-[#5B21B6] px-5 py-2 text-sm font-black text-white disabled:opacity-50">
          {t("Save", "حفظ")}
        </button>
        {done ? <span className="text-xs font-black text-emerald-500">{t("Saved", "تسجّل")}</span> : null}
      </div>
    </div>
  );
}

function LogsPanel({
  logs,
  dark,
  lang,
  card,
  subtle,
  chip,
}: {
  logs: TrackingLog[];
  dark: boolean;
  lang: Lang;
  card: string;
  subtle: string;
  chip: string;
}) {
  const isArabic = lang === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const rows = logs.filter((l) => !statusFilter || l.status === statusFilter);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {["", "ok", "error"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-black ${statusFilter === s ? "bg-[#5B21B6] text-white" : chip}`}
          >
            {s === "" ? t("All", "الكل") : s === "ok" ? t("Success", "ناجح") : t("Errors", "أخطاء")}
          </button>
        ))}
      </div>
      <div className={`overflow-hidden rounded-3xl border ${card}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`text-xs ${subtle}`}>
              <tr>
                <th className="px-4 py-3 text-start font-black">{t("Time", "الوقت")}</th>
                <th className="px-4 py-3 text-start font-black">{t("Platform", "المنصة")}</th>
                <th className="px-4 py-3 text-start font-black">{t("Event", "الحدث")}</th>
                <th className="px-4 py-3 text-start font-black">{t("Source", "المصدر")}</th>
                <th className="px-4 py-3 text-start font-black">{t("Status", "الحالة")}</th>
                <th className="px-4 py-3 text-start font-black">{t("Message", "الرسالة")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className={dark ? "border-t border-white/5" : "border-t border-gray-100"}>
                  <td className={`px-4 py-3 ${subtle}`}>{l.created_at.replace("T", " ").slice(0, 16)}</td>
                  <td className="px-4 py-3 font-bold">{PLATFORM_SHORT[l.platform] ?? l.platform}</td>
                  <td className="px-4 py-3">{l.event_name}</td>
                  <td className="px-4 py-3">{l.source}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 ${l.status === "error" ? "text-rose-500" : "text-emerald-500"}`}>
                      <span className={`h-2 w-2 rounded-full ${l.status === "error" ? "bg-rose-500" : "bg-emerald-500"}`} />
                      {l.status}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${subtle}`}>{l.message ?? "—"}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={6} className={`px-4 py-8 text-center ${subtle}`}>{t("No logs yet.", "ماكاين حتى سجل.")}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function errorMessage(err: unknown, lang: Lang): string {
  const isArabic = lang === "ar";
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return isArabic ? "وقع خطأ غير متوقع." : "Unexpected error.";
}
