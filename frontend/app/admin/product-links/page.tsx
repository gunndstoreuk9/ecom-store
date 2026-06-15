"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  CheckSquare,
  Copy,
  ExternalLink,
  Moon,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sun,
  Trash2,
} from "lucide-react";
import {
  ApiError,
  ProductLink,
  ProductLinkPayload,
  ProductLinkPlatform,
  ProductLinkStatus,
  bulkProductLinks,
  createProductLink,
  deleteProductLink,
  duplicateProductLink,
  getProductLinks,
  updateProductLink,
} from "@/lib/api";

type Lang = "en" | "ar";

const ADMIN_KEY_STORAGE = "tawazon_admin_key";
const LANG_STORAGE = "tawazon_admin_lang";
const THEME_STORAGE = "tawazon_links_theme";

const PLATFORMS: { value: ProductLinkPlatform | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "tiktok", label: "TikTok" },
  { value: "meta", label: "Meta" },
  { value: "google", label: "Google" },
  { value: "youtube", label: "YouTube" },
  { value: "other", label: "Other" },
];

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

const STATUS_COLORS: Record<ProductLinkStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-500",
  disabled: "bg-amber-500/15 text-amber-500",
  archived: "bg-slate-500/15 text-slate-400",
};

export default function ProductLinksPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const [dark, setDark] = useState(true);
  const [adminKey, setAdminKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [links, setLinks] = useState<ProductLink[]>([]);
  const [days, setDays] = useState(30);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<ProductLink | null>(null);
  const [creating, setCreating] = useState(false);
  const [pinAction, setPinAction] = useState<{ type: "delete" | "bulk-delete"; id?: string } | null>(null);
  const [pin, setPin] = useState("");
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
    void loadLinks(savedKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey, days, platform, status]);

  async function loadLinks(key = currentKey) {
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getProductLinks(key, { q: query, platform, status, days });
      setLinks(result.links);
      setSelected(new Set());
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

  const totals = useMemo(() => {
    return links.reduce(
      (acc, link) => {
        acc.clicks += link.stats.total_clicks;
        acc.visitors += link.stats.total_visitors;
        acc.orders += link.stats.total_orders;
        acc.confirmed += link.stats.confirmed_orders;
        acc.delivered += link.stats.delivered_orders;
        return acc;
      },
      { clicks: 0, visitors: 0, orders: 0, confirmed: 0, delivered: 0 }
    );
  }, [links]);

  const card = dark ? "bg-[#121A2C] border-white/5" : "bg-white border-gray-100";
  const bg = dark ? "bg-[#0A0F1C] text-slate-100" : "bg-[#F5F7FB] text-[#102033]";
  const subtle = dark ? "text-slate-400" : "text-[#667085]";
  const chip = dark ? "bg-white/5 text-slate-300" : "bg-[#F1F5F9] text-[#475569]";
  const input = dark ? "bg-[#0E1626] border-white/10 text-slate-100" : "bg-white border-gray-200 text-[#102033]";

  if (!savedKey) {
    return (
      <section dir={isArabic ? "rtl" : "ltr"} className={`flex min-h-screen items-center justify-center px-4 ${bg}`}>
        <form onSubmit={handleLogin} className={`w-full max-w-md rounded-3xl border p-8 shadow-xl ${card}`}>
          <h1 className="text-2xl font-black">{t("Product Links Manager", "مدير روابط المنتجات")}</h1>
          <p className={`mt-1 text-sm ${subtle}`}>{t("Admin access required.", "خاص دخول الأدمين.")}</p>
          <input
            type="password"
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            placeholder={t("Admin API key", "مفتاح الأدمين")}
            className={`mt-6 w-full rounded-2xl border px-4 py-3 text-sm font-bold outline-none ${input}`}
          />
          <button className="mt-3 w-full rounded-2xl bg-[#5B21B6] px-4 py-3 text-sm font-black text-white">
            {t("Enter", "دخول")}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section dir={isArabic ? "rtl" : "ltr"} className={`min-h-screen ${bg}`}>
      <header className="sticky top-0 z-40 bg-gradient-to-l from-[#0B1724] to-[#0F766E] text-white shadow-lg">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 transition hover:bg-white/25">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-white/70">{t("Marketing", "التسويق")}</p>
              <h1 className="text-xl font-black">{t("Product Links Manager", "مدير روابط المنتجات")}</h1>
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
                  className={`rounded-full px-3 py-1.5 text-xs font-black ${lang === item ? "bg-white text-[#0F766E]" : "text-white"}`}
                >
                  {item === "ar" ? "العربية" : "EN"}
                </button>
              ))}
            </div>
            <button onClick={() => void loadLinks()} className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black transition hover:bg-white/25">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {t("Refresh", "تحديث")}
            </button>
            <button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-[#0F766E]">
              <Plus className="h-4 w-4" />
              {t("Create Link", "إضافة رابط")}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] space-y-5 px-4 py-6 sm:px-6">
        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div> : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi card={card} subtle={subtle} label={t("Clicks", "النقرات")} value={totals.clicks} />
          <Kpi card={card} subtle={subtle} label={t("Visitors", "الزوار")} value={totals.visitors} />
          <Kpi card={card} subtle={subtle} label={t("Orders", "الطلبات")} value={totals.orders} />
          <Kpi card={card} subtle={subtle} label={t("Confirmed", "المؤكدة")} value={totals.confirmed} />
          <Kpi card={card} subtle={subtle} label={t("Delivered", "المسلّمة")} value={totals.delivered} />
        </div>

        <div className={`rounded-3xl border p-4 ${card}`}>
          <div className="flex flex-wrap gap-2">
            {DATE_FILTERS.map((filter) => (
              <button
                key={filter.days}
                onClick={() => setDays(filter.days)}
                className={`rounded-full px-3 py-1.5 text-xs font-black ${days === filter.days ? "bg-[#0F766E] text-white" : chip}`}
              >
                {t(filter.en, filter.ar)}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className={`flex min-w-[240px] items-center gap-2 rounded-full border px-3 ${input}`}>
              <Search className="h-4 w-4 opacity-60" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void loadLinks();
                }}
                placeholder={t("Search product, URL, campaign, ad account...", "بحث بالمنتج، الرابط، الحملة، الحساب...")}
                className="w-full bg-transparent py-2 text-sm font-bold outline-none"
              />
            </div>
            <select value={platform} onChange={(event) => setPlatform(event.target.value)} className={`rounded-full border px-3 py-2 text-sm font-bold outline-none ${input}`}>
              {PLATFORMS.map((item) => (
                <option key={item.value || "all"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={`rounded-full border px-3 py-2 text-sm font-bold outline-none ${input}`}>
              <option value="">{t("All statuses", "كل الحالات")}</option>
              <option value="active">{t("Active", "نشط")}</option>
              <option value="disabled">{t("Disabled", "معطل")}</option>
              <option value="archived">{t("Archived", "مؤرشف")}</option>
            </select>
            <button onClick={() => void loadLinks()} className="rounded-full bg-[#0F766E] px-4 py-2 text-sm font-black text-white">
              {t("Apply", "تطبيق")}
            </button>
          </div>
        </div>

        {selected.size ? (
          <BulkBar
            selected={selected}
            dark={dark}
            lang={lang}
            onClear={() => setSelected(new Set())}
            onAction={(action) => void runBulk(action)}
            onDelete={() => setPinAction({ type: "bulk-delete" })}
          />
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          {links.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              dark={dark}
              lang={lang}
              card={card}
              subtle={subtle}
              chip={chip}
              selected={selected.has(link.id)}
              onSelect={() => toggleSelected(link.id)}
              onEdit={() => setEditing(link)}
              onDuplicate={() => void duplicateOne(link.id)}
              onStatus={(next) => void updateStatus(link.id, next)}
              onDelete={() => setPinAction({ type: "delete", id: link.id })}
            />
          ))}
        </div>

        {!links.length ? (
          <div className={`rounded-3xl border p-10 text-center text-sm font-bold ${card} ${subtle}`}>
            {t("No product links found. Create your first campaign URL.", "ماكاين حتى رابط. زيد أول رابط حملة.")}
          </div>
        ) : null}
      </main>

      {(creating || editing) ? (
        <LinkEditor
          dark={dark}
          lang={lang}
          adminKey={currentKey}
          link={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            void loadLinks();
          }}
        />
      ) : null}

      {pinAction ? (
        <PinDialog
          dark={dark}
          lang={lang}
          pin={pin}
          setPin={setPin}
          onClose={() => {
            setPin("");
            setPinAction(null);
          }}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
    </section>
  );

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function duplicateOne(id: string) {
    await duplicateProductLink(currentKey, id);
    await loadLinks();
  }

  async function updateStatus(id: string, next: ProductLinkStatus) {
    await updateProductLink(currentKey, id, { status: next });
    await loadLinks();
  }

  async function runBulk(action: ProductLinkStatus) {
    await bulkProductLinks(currentKey, [...selected], action);
    await loadLinks();
  }

  async function confirmDelete() {
    if (!pinAction) return;
    if (pinAction.type === "delete" && pinAction.id) {
      await deleteProductLink(currentKey, pinAction.id, pin);
    } else {
      await bulkProductLinks(currentKey, [...selected], "delete", pin);
    }
    setPin("");
    setPinAction(null);
    await loadLinks();
  }
}

function Kpi({ card, subtle, label, value }: { card: string; subtle: string; label: string; value: number }) {
  return (
    <div className={`rounded-3xl border p-4 ${card}`}>
      <p className={`text-[11px] font-black uppercase tracking-wide ${subtle}`}>{label}</p>
      <p className="mt-1 text-2xl font-black">{value.toLocaleString()}</p>
    </div>
  );
}

function LinkCard({
  link,
  dark,
  lang,
  card,
  subtle,
  chip,
  selected,
  onSelect,
  onEdit,
  onDuplicate,
  onStatus,
  onDelete,
}: {
  link: ProductLink;
  dark: boolean;
  lang: Lang;
  card: string;
  subtle: string;
  chip: string;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onStatus: (status: ProductLinkStatus) => void;
  onDelete: () => void;
}) {
  const isArabic = lang === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);
  const border = dark ? "border-white/10" : "border-gray-100";

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
  }

  return (
    <article className={`rounded-3xl border p-5 ${card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button onClick={onSelect} className={`mt-1 flex h-5 w-5 items-center justify-center rounded border ${selected ? "bg-[#0F766E] text-white" : border}`}>
            {selected ? <CheckSquare className="h-4 w-4" /> : null}
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${chip}`}>{link.platform}</span>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${STATUS_COLORS[link.status]}`}>{link.status}</span>
            </div>
            <h3 className="mt-2 text-lg font-black">{link.name}</h3>
            <p className={`text-xs font-bold ${subtle}`}>{link.product_name}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => void copy(link.public_url)} className={`rounded-full p-2 ${chip}`} title="Copy">
            <Copy className="h-4 w-4" />
          </button>
          <a href={link.public_url} target="_blank" rel="noreferrer" className={`rounded-full p-2 ${chip}`} title="Open">
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className={`mt-3 rounded-2xl p-3 text-xs font-bold ${chip}`}>
        <p className="break-all">{link.public_url}</p>
        <p className={`mt-1 break-all ${subtle}`}>{link.full_url}</p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <Metric label={t("Clicks", "نقرات")} value={link.stats.total_clicks} chip={chip} />
        <Metric label={t("Visitors", "زوار")} value={link.stats.total_visitors} chip={chip} />
        <Metric label={t("Orders", "طلبات")} value={link.stats.total_orders} chip={chip} />
        <Metric label={t("Confirmed", "مؤكدة")} value={link.stats.confirmed_orders} chip={chip} />
        <Metric label={t("Delivered", "مسلمة")} value={link.stats.delivered_orders} chip={chip} />
        <Metric label={t("CR", "التحويل")} value={`${link.stats.conversion_rate}%`} chip={chip} />
      </div>

      <div className={`mt-3 grid gap-1 text-xs ${subtle}`}>
        {link.campaign_name ? <p>{t("Campaign", "الحملة")}: <b>{link.campaign_name}</b></p> : null}
        {link.ad_account_name ? <p>{t("Ad Account", "حساب الإعلانات")}: <b>{link.ad_account_name}</b></p> : null}
        {link.notes ? <p>{t("Notes", "ملاحظات")}: {link.notes}</p> : null}
        <p>{t("Created", "تاريخ الإنشاء")}: {link.created_at.slice(0, 10)} · {t("Modified", "آخر تعديل")}: {link.updated_at.slice(0, 10)}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onEdit} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${chip}`}><Pencil className="h-3.5 w-3.5" />{t("Edit", "تعديل")}</button>
        <button onClick={onDuplicate} className={`rounded-full px-3 py-1.5 text-xs font-black ${chip}`}>{t("Duplicate", "نسخ")}</button>
        <button onClick={() => onStatus(link.status === "active" ? "disabled" : "active")} className={`rounded-full px-3 py-1.5 text-xs font-black ${chip}`}>
          {link.status === "active" ? t("Disable", "تعطيل") : t("Enable", "تفعيل")}
        </button>
        <button onClick={() => onStatus("archived")} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${chip}`}><Archive className="h-3.5 w-3.5" />{t("Archive", "أرشفة")}</button>
        <button onClick={onDelete} className="flex items-center gap-1.5 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-black text-white"><Trash2 className="h-3.5 w-3.5" />{t("Delete", "حذف")}</button>
      </div>
    </article>
  );
}

function Metric({ label, value, chip }: { label: string; value: string | number; chip: string }) {
  return (
    <div className={`rounded-2xl p-2 ${chip}`}>
      <p className="text-[10px] font-black uppercase opacity-70">{label}</p>
      <p className="mt-0.5 text-base font-black">{typeof value === "number" ? value.toLocaleString() : value}</p>
    </div>
  );
}

function BulkBar({
  selected,
  dark,
  lang,
  onClear,
  onAction,
  onDelete,
}: {
  selected: Set<string>;
  dark: boolean;
  lang: Lang;
  onClear: () => void;
  onAction: (action: ProductLinkStatus) => void;
  onDelete: () => void;
}) {
  const isArabic = lang === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);
  const cls = dark ? "bg-[#121A2C] border-white/5" : "bg-white border-gray-100";
  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-3xl border p-3 ${cls}`}>
      <span className="text-sm font-black">{selected.size} {t("selected", "مختار")}</span>
      <button onClick={() => onAction("active")} className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-black text-white">{t("Enable Selected", "تفعيل المختار")}</button>
      <button onClick={() => onAction("disabled")} className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-black text-white">{t("Disable Selected", "تعطيل المختار")}</button>
      <button onClick={() => onAction("archived")} className="rounded-full bg-slate-500 px-3 py-1.5 text-xs font-black text-white">{t("Archive Selected", "أرشفة المختار")}</button>
      <button onClick={onDelete} className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-black text-white">{t("Delete Selected", "حذف المختار")}</button>
      <button onClick={onClear} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black">{t("Clear", "إلغاء")}</button>
    </div>
  );
}

function LinkEditor({
  dark,
  lang,
  adminKey,
  link,
  onClose,
  onSaved,
}: {
  dark: boolean;
  lang: Lang;
  adminKey: string;
  link: ProductLink | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isArabic = lang === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);
  const [form, setForm] = useState<ProductLinkPayload>({
    name: link?.name ?? "",
    full_url: link?.full_url ?? "https://tawazonhealth.store/products/balance",
    product_name: link?.product_name ?? "المركّب الأمريكي لضبط السكر — الأصلي",
    platform: link?.platform ?? "tiktok",
    campaign_name: link?.campaign_name ?? "",
    ad_account_name: link?.ad_account_name ?? "",
    notes: link?.notes ?? "",
    status: link?.status ?? "active",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panel = dark ? "bg-[#121A2C] text-slate-100" : "bg-white text-[#102033]";
  const input = dark ? "bg-[#0E1626] border-white/10 text-slate-100" : "bg-white border-gray-200 text-[#102033]";

  async function save() {
    setBusy(true);
    setError(null);
    try {
      if (link) await updateProductLink(adminKey, link.id, form);
      else await createProductLink(adminKey, form);
      onSaved();
    } catch (err) {
      setError(errorMessage(err, lang));
    } finally {
      setBusy(false);
    }
  }

  function set<K extends keyof ProductLinkPayload>(key: K, value: ProductLinkPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-10">
      <div className={`w-full max-w-2xl rounded-3xl p-6 shadow-2xl ${panel}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">{link ? t("Edit Link", "تعديل الرابط") : t("Create Product Link", "إضافة رابط منتج")}</h2>
          <button onClick={onClose} className="text-sm font-black opacity-60">✕</button>
        </div>
        {error ? <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-500">{error}</p> : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label={t("Link Name", "اسم الرابط")} value={form.name ?? ""} onChange={(v) => set("name", v)} input={input} />
          <label className="block text-xs font-black uppercase opacity-70">
            {t("Platform", "المنصة")}
            <select value={form.platform} onChange={(event) => set("platform", event.target.value as ProductLinkPlatform)} className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none ${input}`}>
              {PLATFORMS.filter((item) => item.value).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <Field label={t("Full URL", "الرابط الكامل")} value={form.full_url ?? ""} onChange={(v) => set("full_url", v)} input={input} wide />
          <Field label={t("Product Name", "اسم المنتج")} value={form.product_name ?? ""} onChange={(v) => set("product_name", v)} input={input} />
          <Field label={t("Campaign Name", "اسم الحملة")} value={form.campaign_name ?? ""} onChange={(v) => set("campaign_name", v)} input={input} />
          <Field label={t("Ad Account Name", "اسم حساب الإعلانات")} value={form.ad_account_name ?? ""} onChange={(v) => set("ad_account_name", v)} input={input} />
          <label className="block text-xs font-black uppercase opacity-70 sm:col-span-2">
            {t("Notes", "ملاحظات")}
            <textarea value={form.notes ?? ""} onChange={(event) => set("notes", event.target.value)} className={`mt-1 min-h-24 w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none ${input}`} />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className={`rounded-full px-5 py-2 text-sm font-black ${dark ? "bg-white/10" : "bg-gray-100"}`}>{t("Cancel", "إلغاء")}</button>
          <button onClick={() => void save()} disabled={busy || !form.name || !form.full_url || !form.product_name} className="rounded-full bg-[#0F766E] px-5 py-2 text-sm font-black text-white disabled:opacity-50">{t("Save", "حفظ")}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, input, wide = false }: { label: string; value: string; onChange: (value: string) => void; input: string; wide?: boolean }) {
  return (
    <label className={`block text-xs font-black uppercase opacity-70 ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none ${input}`} />
    </label>
  );
}

function PinDialog({
  dark,
  lang,
  pin,
  setPin,
  onClose,
  onConfirm,
}: {
  dark: boolean;
  lang: Lang;
  pin: string;
  setPin: (pin: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isArabic = lang === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);
  const panel = dark ? "bg-[#121A2C] text-slate-100" : "bg-white text-[#102033]";
  const input = dark ? "bg-[#0E1626] border-white/10 text-slate-100" : "bg-white border-gray-200 text-[#102033]";
  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl ${panel}`}>
        <h2 className="text-lg font-black">{t("Admin PIN Required", "رمز الأدمين مطلوب")}</h2>
        <p className="mt-1 text-sm opacity-70">{t("Permanent delete actions require ADMIN_RESET_PIN.", "الحذف النهائي يتطلب ADMIN_RESET_PIN.")}</p>
        <input type="password" value={pin} onChange={(event) => setPin(event.target.value)} placeholder="PIN" className={`mt-4 w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none ${input}`} />
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className={`rounded-full px-5 py-2 text-sm font-black ${dark ? "bg-white/10" : "bg-gray-100"}`}>{t("Cancel", "إلغاء")}</button>
          <button onClick={onConfirm} disabled={!pin} className="rounded-full bg-rose-500 px-5 py-2 text-sm font-black text-white disabled:opacity-50">{t("Confirm Delete", "تأكيد الحذف")}</button>
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
